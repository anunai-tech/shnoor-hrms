import { useState, useEffect, useRef, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../services/api'
import {
  getActiveGateways,
  createPaymentOrder,
  verifyPayment as verifyPaymentApi,
  initiateManualPayment,
  getClientInvoices,
  downloadClientInvoice,
  uploadPaymentScreenshot
} from '../../services/clientService'

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n, cur = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// ─── Tiny UI primitives ──────────────────────────────────────────────────────
const Badge = ({ children, color = 'amber' }) => {
  const colors = {
    amber: 'bg-amber-100 text-amber-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    gray: 'bg-gray-100 text-gray-600',
    blue: 'bg-blue-100 text-blue-800',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] || colors.gray}`}>
      {children}
    </span>
  )
}

const Spinner = ({ sm }) => (
  <div className={`${sm ? 'w-4 h-4 border-2' : 'w-8 h-8 border-4'} border-amber-500 border-t-transparent rounded-full animate-spin`} />
)

const SectionCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>{children}</div>
)

// ─── Main component ──────────────────────────────────────────────────────────
export default function Billings() {
  const [currentPlan, setCurrentPlan] = useState(null)
  const [plans, setPlans] = useState([])
  const [gateways, setGateways] = useState({ automatic: [], upi: false, netbanking: false })
  const [invoices, setInvoices] = useState([])

  const [loadingPlan, setLoadingPlan] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [loadingInvoices, setLoadingInvoices] = useState(true)

  const [billing, setBilling] = useState('monthly')
  const [selPlan, setSelPlan] = useState(null)
  const [selGateway, setSelGateway] = useState(null)
  const [payStep, setPayStep] = useState('select')
  const [manualData, setManualData] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paying, setPaying] = useState(false)
  const [failedGateway, setFailedGateway] = useState(null)

  const gatewayRef = useRef(null)
  const successRef = useRef(null)

// Detect PayU redirect return — ?payu=success or ?payu=failed in URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payuStatus = params.get('payu')
    if (payuStatus === 'success') {
      setSuccess('PayU payment completed. Our team will verify and activate your subscription shortly.')
      loadInvoices()
      window.history.replaceState({}, '', '/client/billings')
    } else if (payuStatus === 'failed') {
      setError('PayU payment failed or was cancelled. Please try again.')
      window.history.replaceState({}, '', '/client/billings')
    }
  }, [])

  // ── Independent loaders ───────────────────────────────────────────────────
  useEffect(() => {
    api.get('/client/plan')
      .then(r => { if (r.data.success) setCurrentPlan(r.data.data) })
      .catch(() => { })
      .finally(() => setLoadingPlan(false))
  }, [])

  useEffect(() => {
    // /public/plans — no auth needed, but api instance is fine too
    api.get('/public/plans')
      .then(r => { if (r.data.success) setPlans(r.data.data || []) })
      .catch(() => { })
      .finally(() => setLoadingPlans(false))
  }, [])

  useEffect(() => {
    getActiveGateways()
      .then(r => {
        console.log('GATEWAYS RESPONSE:', JSON.stringify(r.data))
        if (r.data.success) setGateways(r.data.data)
      })
      .catch(err => {
        console.error('GATEWAYS ERROR:', err.message, err.response?.status, JSON.stringify(err.response?.data))
      })
  }, [])

  const loadInvoices = useCallback(() => {
    setLoadingInvoices(true)
    getClientInvoices()
      .then(r => { if (r.data.success) setInvoices(r.data.data || []) })
      .catch(() => { })
      .finally(() => setLoadingInvoices(false))
  }, [])

  useEffect(() => { loadInvoices() }, [loadInvoices])

  // ── Select plan → scroll to gateway ──────────────────────────────────────
  const handlePlanSelect = (plan) => {
    setSelPlan(plan)
    setSelGateway(null)
    setPayStep('select')
    setError('')
    setTimeout(() => gatewayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  // ── Pay ───────────────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (!selPlan || !selGateway) { setError('Please select a plan and a payment method.'); return }
    setError('')
    setPaying(true)
    setPayStep('processing')

    try {
      if (selGateway === 'upi' || selGateway === 'netbanking') {
        const r = await initiateManualPayment({ plan_id: selPlan.id, billing_type: billing, gateway: selGateway })
        if (!r.data.success) throw new Error(r.data.message || 'Failed to initiate payment')
        setManualData(r.data.data)
        setPayStep('manual_pending')
        setPaying(false)
        return
      }

      const orderRes = await createPaymentOrder({ plan_id: selPlan.id, billing_type: billing, gateway: selGateway })
      if (!orderRes.data.success) throw new Error(orderRes.data.message || 'Could not create order')
      const od = orderRes.data.data

      if (selGateway === 'razorpay') await launchRazorpay(od)
      else if (selGateway === 'cashfree') await launchCashfree(od)
      else if (selGateway === 'paypal') launchPayPal(od)
      else if (selGateway === 'payu') launchPayU(od)
      else throw new Error(`${selGateway} checkout not wired — ask admin.`)
    } catch (e) {
      setFailedGateway(selGateway)
      setError(`Payment via ${selGateway} failed. Please select another method and try again.`)
      setPayStep('select')
    }
    setPaying(false)
  }

  const launchRazorpay = (od) => new Promise((resolve, reject) => {
    if (!window.Razorpay) return reject(new Error('Razorpay SDK not loaded. Add <script src="https://checkout.razorpay.com/v1/checkout.js"> to index.html'))
    const rzp = new window.Razorpay({
      key: od.key_id,
      amount: od.amount,
      currency: od.currency,
      name: 'SHNOOR HRMS',
      description: `${od.plan_name} — ${billing}`,
      order_id: od.order_id,
      handler: async (resp) => {
        try {
          const vd = await verifyPaymentApi({
            gateway: 'razorpay',
            order_id: resp.razorpay_order_id,
            payment_id: resp.razorpay_payment_id,
            signature: resp.razorpay_signature,
            plan_id: selPlan.id,
            billing_type: billing
          })
          if (!vd.data.success) throw new Error(vd.data.message)
          onPaymentSuccess(); resolve()
        } catch (e) { reject(e) }
      },
      modal: { ondismiss: () => { setPayStep('select'); setPaying(false) } },
      theme: { color: '#D97706' }
    })
    rzp.open()
  })

  const launchCashfree = (od) => new Promise((resolve, reject) => {
    const init = () => {
      if (!window.Cashfree) return reject(new Error('Cashfree SDK failed to load'))
      const cashfree = window.Cashfree({ mode: 'sandbox' })
      cashfree.checkout({ paymentSessionId: od.payment_session_id })
        .then(async (result) => {
          if (result.error) { setError(result.error.message); setPayStep('select'); resolve(); return }
          try {
            const vd = await verifyPaymentApi({
              gateway: 'cashfree',
              order_id: od.order_id,
              payment_id: result.paymentDetails?.paymentMessage || '',
              signature: result.paymentDetails?.signature || '',
              plan_id: selPlan.id,
              billing_type: billing
            })
            if (vd.data.success) onPaymentSuccess()
            else setError(vd.data.message || 'Verification failed')
          } catch (e) { setError(e.message) }
          setPayStep('select'); resolve()
        })
    }
    if (window.Cashfree) { init(); return }
    const s = document.createElement('script')
    s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
    s.onload = init
    s.onerror = () => reject(new Error('Failed to load Cashfree SDK'))
    document.head.appendChild(s)
  })

  const launchPayPal = (od) => {
    const baseUrl = od.paypal_env === 'production'
      ? 'https://www.paypal.com'
      : 'https://www.sandbox.paypal.com'
    window.open(`${baseUrl}/checkoutnow?token=${od.order_id}`, '_blank')
    setError('PayPal sandbox opened in a new tab. Complete payment there, then contact admin to activate subscription.')
    setPayStep('select')
    setPaying(false)
  }

  // PayU uses redirect-based checkout — dynamically creates and submits an HTML form.
  // After payment, PayU redirects back to surl (success) or furl (failure).
  const launchPayU = (od) => {
    const payuUrl = 'https://test.payu.in/_payment'

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = payuUrl

    const fields = {
      key:         od.key,
      txnid:       od.txnid,
      amount:      od.amount,
      productinfo: od.productinfo,
      firstname:   od.firstname,
      email:       od.email,
      phone:       '9999999999',
      surl:        `${window.location.origin}/client/billings?payu=success&txnid=${od.txnid}`,
      furl:        `${window.location.origin}/client/billings?payu=failed&txnid=${od.txnid}`,
      hash:        od.hash,
    }

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = name
      input.value = value
      form.appendChild(input)
    })

    document.body.appendChild(form)
    form.submit()
    // Page redirects to PayU — no further JS runs after this.
  }

  const onPaymentSuccess = () => {
    setSuccess('Payment successful! Your subscription is now active.')
    setSelPlan(null); setSelGateway(null); setPayStep('select')
    api.get('/client/plan').then(r => { if (r.data.success) setCurrentPlan(r.data.data) }).catch(() => { })
    loadInvoices()
    setTimeout(() => successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleDownload = async (inv) => {
    try {
      const r = await downloadClientInvoice(inv.id)
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url; a.download = `${inv.invoice_number}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Failed to download invoice') }
  }

  const planPrice = (plan) =>
    billing === 'yearly' ? parseFloat(plan.annual_price) : parseFloat(plan.monthly_price)

  const hasGateway = gateways.automatic.length > 0 || gateways.upi || gateways.netbanking

  // ─────────────────────────────── RENDER ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your plan, make payments, and download invoices.</p>
        </div>

        {/* Success banner */}
        {success && (
          <div ref={successRef} className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
            <svg className="w-5 h-5 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="flex-1 text-sm font-medium text-green-800">{success}</p>
            <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">✕</button>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="flex-1 text-sm text-red-700">{error}</p>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Current Plan Card */}
        <SectionCard className="overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="text-amber-100 text-sm font-medium mb-1">Current Plan</p>
                {loadingPlan ? (
                  <div className="h-8 w-32 bg-white/20 rounded animate-pulse" />
                ) : currentPlan?.id ? (
                  <>
                    <h2 className="text-2xl font-bold">{currentPlan.name}</h2>
                    <p className="text-amber-100 text-sm mt-1">Up to {currentPlan.max_users} users</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold">No Active Plan</h2>
                    <p className="text-amber-100 text-sm mt-1">Choose a plan below to get started</p>
                  </>
                )}
              </div>
              {!loadingPlan && currentPlan?.id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeout(() => document.getElementById('plan-section')?.scrollIntoView({ behavior: 'smooth' }), 80)}
                    className="px-4 py-2 bg-white text-amber-700 text-sm font-semibold rounded-lg hover:bg-amber-50 transition-colors"
                  >
                    Upgrade Plan
                  </button>
                  <button
                    onClick={() => { const p = plans.find(p => p.id === currentPlan.id); if (p) handlePlanSelect(p) }}
                    className="px-4 py-2 bg-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/30 transition-colors border border-white/30"
                  >
                    Renew
                  </button>
                </div>
              )}
            </div>
          </div>
          {!loadingPlan && currentPlan?.id && (
            <div className="px-6 py-4 flex flex-wrap gap-6 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Monthly price</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{fmt(currentPlan.monthly_price)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Yearly price</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{fmt(currentPlan.annual_price)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Status</p>
                <div className="mt-0.5"><Badge color="green">Active</Badge></div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Plan Selection */}
        <div id="plan-section">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Choose a Plan</h2>
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billing === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('yearly')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${billing === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Yearly
                <span className="ml-1.5 text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Save ~17%</span>
              </button>
            </div>
          </div>

          {loadingPlans ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3 animate-pulse">
                  <div className="h-5 bg-gray-100 rounded w-1/3" />
                  <div className="h-8 bg-gray-100 rounded w-1/2" />
                  {[1, 2, 3].map(j => <div key={j} className="h-3 bg-gray-100 rounded" />)}
                </div>
              ))}
            </div>
          ) : plans.length === 0 ? (
            <SectionCard className="p-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm font-medium">No plans available yet</p>
              <p className="text-gray-400 text-xs mt-1">Run the migration SQL and seed plans from the superadmin panel.</p>
            </SectionCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => {
                const isActive = currentPlan?.id === plan.id
                const isSelected = selPlan?.id === plan.id
                const price = planPrice(plan)
                const features = Array.isArray(plan.features)
                  ? plan.features
                  : (plan.features ? JSON.parse(plan.features) : [])

                return (
                  <div
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan)}
                    className={`relative rounded-2xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-md
                      ${isSelected
                        ? 'border-amber-500 bg-amber-50 shadow-md'
                        : plan.is_highlighted
                          ? 'border-amber-300 bg-white shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-900">{plan.name}</span>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {plan.is_highlighted && !isSelected && !isActive && <Badge color="amber">Most Popular</Badge>}
                        {isActive && <Badge color="green">Active</Badge>}
                        {isSelected && <Badge color="amber">Selected ✓</Badge>}
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-extrabold text-gray-900">{fmt(price)}</span>
                      <span className="text-sm text-gray-400 ml-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>
                      {billing === 'yearly' && (
                        <p className="text-xs text-gray-400 mt-1">{fmt(parseFloat(plan.annual_price) / 12)}/mo billed annually</p>
                      )}
                    </div>

                    {features.length > 0 && (
                      <ul className="space-y-2 mb-5">
                        {features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className={`w-full py-2 rounded-xl text-sm font-semibold text-center transition-colors
                      ${isSelected ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-800'}`}
                    >
                      {isSelected ? '✓ Selected' : isActive ? 'Renew' : plan.cta_text || 'Select Plan'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Gateway picker */}
        {selPlan && (
          <div ref={gatewayRef}>
            <SectionCard className="p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <strong>{selPlan.name}</strong> ({billing}) — <strong>{fmt(planPrice(selPlan))}</strong> + 18% GST
                  </p>
                </div>
                <button
                  onClick={() => { setSelPlan(null); setSelGateway(null); setPayStep('select'); setError('') }}
                  className="text-sm text-gray-400 hover:text-gray-700"
                >
                  ✕ Cancel
                </button>
              </div>

              {!hasGateway ? (
                <div className="text-center py-6 text-gray-500 text-sm">
                  No payment methods are configured yet. Contact your administrator.
                </div>
              ) : (
                <>
                  {gateways.automatic.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Online Payment</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {gateways.automatic.map(gw => (
                          <button
                            key={gw}
                            onClick={() => setSelGateway(gw)}
                            className={`flex flex-col items-center justify-center py-4 px-3 rounded-xl border-2 text-sm font-medium capitalize transition-all
                              ${selGateway === gw ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-100 hover:border-gray-300 text-gray-700'}`}
                          >
                            <GatewayIcon name={gw} />
                            <span className="mt-2">{gw}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(gateways.upi || gateways.netbanking) && (
                    <div className="mb-6">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Manual Transfer</p>
                      <div className="grid grid-cols-2 gap-2">
                        {gateways.upi && (
                          <button
                            onClick={() => setSelGateway('upi')}
                            className={`flex flex-col items-center justify-center py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all
                              ${selGateway === 'upi' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-100 hover:border-gray-300 text-gray-700'}`}
                          >
                            <GatewayIcon name="upi" />
                            <span className="mt-2">UPI / QR Code</span>
                          </button>
                        )}
                        {gateways.netbanking && (
                          <button
                            onClick={() => setSelGateway('netbanking')}
                            className={`flex flex-col items-center justify-center py-4 px-3 rounded-xl border-2 text-sm font-medium transition-all
                              ${selGateway === 'netbanking' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-100 hover:border-gray-300 text-gray-700'}`}
                          >
                            <GatewayIcon name="netbanking" />
                            <span className="mt-2">Net Banking</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {selGateway && payStep !== 'manual_pending' && (
                    <>
                      <div className="bg-gray-50 rounded-xl p-4 mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Subtotal</span><span>{fmt(planPrice(selPlan))}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>GST (18%)</span><span>{fmt(planPrice(selPlan) * 0.18)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
                          <span>Total</span>
                          <span className="text-amber-600">{fmt(planPrice(selPlan) * 1.18)}</span>
                        </div>
                      </div>
                      <button
                        onClick={handlePay}
                        disabled={paying}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        {paying
                          ? <><Spinner sm /> Processing…</>
                          : `Pay ${fmt(planPrice(selPlan) * 1.18)} via ${selGateway.charAt(0).toUpperCase() + selGateway.slice(1)}`
                        }
                      </button>
                    </>
                  )}
                </>
              )}

              {payStep === 'manual_pending' && manualData && (
                <ManualPending
                  data={manualData}
                  gateway={selGateway}
                  onDone={() => {
                    setPayStep('select'); setSelPlan(null); setSelGateway(null)
                    setSuccess("Payment initiated. Awaiting verification by admin. You'll receive confirmation within 24 hours.")
                  }}
                />
              )}
            </SectionCard>
          </div>
        )}

        {/* Invoice History */}
        <SectionCard>
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Invoice History</h2>
            <button onClick={loadInvoices} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {loadingInvoices ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">No invoices yet</p>
              <p className="text-xs text-gray-400 mt-1">Invoices appear here after your first payment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Invoice #', 'Plan', 'Billing', 'Amount', 'Gateway', 'Date', 'Status', ''].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-600 whitespace-nowrap">{inv.invoice_number}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{inv.plan_name || '—'}</td>
                      <td className="px-6 py-4 capitalize text-gray-600">{inv.billing_type || '—'}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">{fmt(inv.total_amount, inv.currency || 'INR')}</td>
                      <td className="px-6 py-4 capitalize text-gray-500">{inv.gateway_used || '—'}</td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{fmtDate(inv.generated_at)}</td>
                      <td className="px-6 py-4">
                        <Badge color={inv.status === 'paid' ? 'green' : inv.status === 'pending' ? 'amber' : 'red'}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {inv.status === 'paid' && (
                          <button
                            onClick={() => handleDownload(inv)}
                            className="text-amber-600 hover:text-amber-800 font-medium text-xs flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            PDF
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  )
}

function GatewayIcon({ name }) {
  const icons = {
    razorpay: (
      <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="#072654"/>
        <path d="M22 6L12.5 20H19L16 30 25.5 16H19L22 6z" fill="#3D88F5"/>
      </svg>
    ),
    cashfree: (
      <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="#00C365"/>
        <path d="M24 14.5c-1.5-2-3.8-3-6-2.8-3.5.3-6 3.2-6 6.8s2.5 6.5 6 6.8c2.2.2 4.5-.8 6-2.8" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <path d="M13 18.5h8" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    ),
    payu: (
      <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="#FF5722"/>
        <path d="M10 13v5.5c0 2.5 1.5 4.5 4.5 4.5s4.5-2 4.5-4.5V13" stroke="white" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        <circle cx="25" cy="19.5" r="3.5" stroke="white" strokeWidth="2.2" fill="none"/>
        <path d="M25 23v4" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    ),
    paytm: (
      <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="#002970"/>
        <rect x="8" y="12" width="9" height="12" rx="1.5" fill="#00B9F2"/>
        <rect x="19" y="12" width="9" height="12" rx="1.5" fill="white"/>
        <rect x="8" y="12" width="20" height="5" rx="1.5" fill="#00B9F2"/>
      </svg>
    ),
    paypal: (
      <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="#003087"/>
        <path d="M20.5 8h-7.5L10 26h4l.8-5h4.2c4 0 7-2.2 7.8-6.5.7-4-1.5-6.5-6.3-6.5z" fill="#009CDE"/>
        <path d="M17 11h-5L9.5 27h3.5l.8-5h3.7c3.5 0 6.2-2 7-5.8.6-3.5-1.3-5.7-5.5-5.2-.7.1-1.5.5-2 1z" fill="white" opacity="0.9"/>
      </svg>
    ),
    upi: (
      <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="#6B21A8"/>
        <path d="M18 9l5 9h-3v9h-4V18h-3L18 9z" fill="white"/>
        <path d="M12 24h12" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    netbanking: (
      <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
        <rect width="36" height="36" rx="8" fill="#1E3A5F"/>
        <path d="M18 8L6 14h24L18 8z" fill="white"/>
        <rect x="8" y="16" width="3" height="8" rx="1" fill="white"/>
        <rect x="13.5" y="16" width="3" height="8" rx="1" fill="white"/>
        <rect x="19.5" y="16" width="3" height="8" rx="1" fill="white"/>
        <rect x="25" y="16" width="3" height="8" rx="1" fill="white"/>
        <rect x="6" y="25" width="24" height="2.5" rx="1" fill="white"/>
      </svg>
    ),
  }
  return icons[name] || (
    <svg className="w-9 h-9" viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="8" fill="#374151"/>
      <path d="M6 14h24M10 26h16a2 2 0 002-2V12a2 2 0 00-2-2H10a2 2 0 00-2 2v12a2 2 0 002 2z"
        stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

// Manual Payment Pending 
function ManualPending({ data, gateway, onDone }) {
  const [copied, setCopied] = useState(false)
  const [screenshot, setScreenshot] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadDone, setUploadDone] = useState(false)

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  // Convert selected image to base64 and upload to server.
  const handleScreenshot = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target.result
      setScreenshot(base64)
      setUploading(true)
      try {
        await uploadPaymentScreenshot({ transaction_id: data.transaction_id, screenshot_url: base64 })
        setUploadDone(true)
      } catch {
        // Screenshot upload failure is non-blocking — payment still proceeds.
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">Payment Reference</p>
        <div className="flex items-center gap-2">
          <code className="text-amber-700 font-mono text-sm bg-white border border-amber-200 px-3 py-1.5 rounded-lg flex-1">{data.reference}</code>
          <button onClick={() => copy(data.reference)} className="text-xs text-amber-600 hover:text-amber-800 font-medium px-2 py-1.5 border border-amber-300 rounded-lg">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Subtotal</span><span>₹{parseFloat(data.base_amount).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>GST ({data.gst_rate}%)</span><span>₹{parseFloat(data.gst_amount).toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
          <span>Total to Pay</span>
          <span className="text-amber-600">₹{parseFloat(data.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {gateway === 'upi' && data.upi_id && (
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-gray-700">Pay to UPI ID</p>
          <div className="flex items-center justify-center gap-2">
            <code className="text-gray-700 font-mono text-sm bg-gray-100 px-3 py-2 rounded-lg">{data.upi_id}</code>
            <button onClick={() => copy(data.upi_id)} className="text-gray-400 hover:text-gray-700 px-2 py-2 border rounded-lg transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400">UPI Name: {data.upi_name}</p>
          {data.qr_data && <QRFallback value={data.qr_data} />}
        </div>
      )}

      {gateway === 'netbanking' && (
        <div className="space-y-2">
          <InfoRow label="Bank" value={data.bank_name} />
          <InfoRow label="Account" value={data.bank_account_no_masked} />
          <InfoRow label="IFSC" value={data.bank_ifsc} onCopy={() => copy(data.bank_ifsc)} />
          <InfoRow label="Account Holder" value={data.bank_holder} />
        </div>
      )}

      {/* Screenshot upload — optional but recommended */}
      <div className="border border-dashed border-gray-300 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-600 mb-2">
          Upload Payment Screenshot <span className="font-normal text-gray-400">(recommended)</span>
        </p>
        {screenshot ? (
          <div className="space-y-2">
            <img src={screenshot} alt="Payment proof" className="w-full max-h-40 object-contain rounded-lg border border-gray-200" />
            {uploading && <p className="text-xs text-gray-400 text-center">Uploading...</p>}
            {uploadDone && <p className="text-xs text-green-600 text-center">✓ Screenshot submitted</p>}
          </div>
        ) : (
          <label className="flex flex-col items-center gap-2 cursor-pointer">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-gray-400">Click to upload screenshot</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
          </label>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        After making the payment, click Done. Our team will verify and activate your plan within 24 hours.
      </p>

      <button
        onClick={onDone}
        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
      >
        Done — I have Made the Payment
      </button>
    </div>
  )
}

function InfoRow({ label, value, onCopy }) {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
      <span className="text-xs text-gray-400 font-medium w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium flex-1 text-right">{value || '—'}</span>
      {onCopy && (
        <button onClick={onCopy} className="ml-3 text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      )}
    </div>
  )
}

function QRFallback({ value }) {
  if (!value) return null
  return (
    <div className="inline-flex p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
      <QRCodeSVG value={value} size={150} />
    </div>
  )
}