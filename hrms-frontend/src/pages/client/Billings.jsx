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
  uploadPaymentScreenshot,
  getPaypalConfig
} from '../../services/clientService'

const fmt = (n, cur = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

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

const ALWAYS_FREE = ['Employee Management', 'Attendance Tracking', 'Leave Management']
const FEATURE_LABELS = {
  holidays: 'Holidays', policies: 'Company Policies', expenses: 'Expense Management',
  salary_payslips: 'Salary & Payslips', letters: 'HR Letters',
  offboarding: 'Offboarding & Complaints', messaging: 'Internal Messaging', branding: 'Custom Branding',
}
const TOTAL_LIMIT_KEYS = new Set(['holidays', 'policies'])

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

  const [billing, setBilling] = useState('monthly')
  const [selPlan, setSelPlan] = useState(null)
  const [selGateway, setSelGateway] = useState(null)
  const [payStep, setPayStep] = useState('select')
  const [manualData, setManualData] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paying, setPaying] = useState(false)
  const [failedGateway, setFailedGateway] = useState(null)
  const [paymentResult, setPaymentResult] = useState(null)

  const gatewayRef = useRef(null)
  const successRef = useRef(null)

  // Detect redirect gateway returns — PayU, Cashfree, Paytm all redirect here with ?payment_status=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment_status')

    if (paymentStatus === 'success') {
      setPaymentResult({
        status: 'success',
        gateway: params.get('gateway'),
        plan: params.get('plan'),
        amount: params.get('amount'),
        invoice: params.get('invoice'),
        invoice_id: params.get('invoice_id'),
        end_date: params.get('end_date')
      })
      // Refresh plan + invoices in the background
      api.get('/client/plan')
        .then(r => { if (r.data.success) setCurrentPlan(r.data.data) })
        .catch(() => { })
      loadInvoices()
      window.history.replaceState({}, '', '/client/billings')
    } else if (paymentStatus === 'failed') {
      const rawReason = params.get('reason') || 'Payment was not completed'
      setPaymentResult({
        status: 'failed',
        gateway: params.get('gateway'),
        reason: rawReason.replace(/\+/g, ' ')
      })
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
    if (selGateway === 'paypal') return // PayPal handled by PayPalButtonContainer
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

      if (selGateway === 'razorpay') {
        const result = await launchRazorpay(od)
        onPaymentSuccess(result)
      } else if (selGateway === 'cashfree') {
        // Redirect gateway — page navigates away to Cashfree
        // Return handler backend verifies and redirects back
        launchCashfree(od).catch(e => {
          setError(e.message)
          setPayStep('select')
          setPaying(false)
        })
        return // keep spinner while redirecting
      } else if (selGateway === 'payu') {
        // Redirect gateway — form POST navigates away to PayU
        launchPayU(od)
        return // keep spinner while redirecting
      } else if (selGateway === 'paytm') {
        const result = await launchPaytm(od)
        onPaymentSuccess(result)
      } else {
        throw new Error(`${selGateway} checkout not wired — contact admin.`)
      }
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
          resolve(vd.data.data)
        } catch (e) { reject(e) }
      },
      modal: { ondismiss: () => { setPayStep('select'); setPaying(false) } },
      theme: { color: '#D97706' }
    })
    rzp.open()
  })

  // Cashfree: redirect mode — page navigates to Cashfree checkout.
  // Backend handles return via /api/v1/payment-return/cashfree.
  const launchCashfree = async (od) => {
    if (!window.Cashfree) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
        s.onload = resolve
        s.onerror = () => reject(new Error('Failed to load Cashfree SDK'))
        document.head.appendChild(s)
      })
    }
    const mode = od.environment === 'production' ? 'production' : 'sandbox'
    const cashfree = window.Cashfree({ mode })
    // redirectTarget: '_self' navigates the current tab to Cashfree hosted checkout
    await cashfree.checkout({
      paymentSessionId: od.payment_session_id,
      redirectTarget: '_self'
    })
    // If we reach here, redirect didn't happen — treat as error
    throw new Error('Cashfree redirect did not occur')
  }

  // Paytm CheckoutJS popup — opens Paytm payment modal on current page
  const launchPaytm = (od) => new Promise((resolve, reject) => {
    const sdkUrl = od.is_production
      ? `https://securegw.paytm.in/merchantpgpui/checkoutjs/merchants/${od.mid}.js`
      : `https://securegw-stage.paytm.in/merchantpgpui/checkoutjs/merchants/${od.mid}.js`

    const openCheckout = () => {
      const config = {
        root: '',
        flow: 'DEFAULT',
        data: {
          orderId: od.order_id,
          token: od.txn_token,
          tokenType: 'TXN_TOKEN',
          amount: od.amount.toString()
        },
        merchant: { mid: od.mid, redirect: false },
        handler: {
          transactionStatus: async (paymentStatus) => {
            window.Paytm?.CheckoutJS?.close()
            if (paymentStatus.STATUS === 'TXN_SUCCESS') {
              try {
                const vd = await verifyPaymentApi({
                  gateway: 'paytm',
                  order_id: od.order_id,
                  payment_id: paymentStatus.TXNID || '',
                  plan_id: selPlan.id,
                  billing_type: billing
                })
                if (vd.data.success) resolve(vd.data.data)
                else reject(new Error(vd.data.message || 'Paytm verification failed'))
              } catch (e) { reject(e) }
            } else {
              reject(new Error(paymentStatus.RESPMSG || 'Paytm payment failed'))
            }
          },
          notifyMerchant: (eventName) => {
            if (eventName === 'SESSION_EXPIRED') {
              reject(new Error('Paytm session expired. Please try again.'))
            }
          }
        }
      }

      window.Paytm.CheckoutJS.onLoad(() => {
        window.Paytm.CheckoutJS.init(config)
          .then(() => window.Paytm.CheckoutJS.invoke())
          .catch(e => reject(new Error('Paytm checkout initialization failed')))
      })
    }

    if (window.Paytm?.CheckoutJS) { openCheckout(); return }

    const s = document.createElement('script')
    s.src = sdkUrl
    s.crossOrigin = 'anonymous'
    s.onload = openCheckout
    s.onerror = () => reject(new Error('Failed to load Paytm SDK'))
    document.head.appendChild(s)
  })

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
      phone:       od.phone || '9999999999',
      surl:        od.surl,  // backend return handler URL — verified server-side
      furl:        od.furl,  // backend return handler URL — verified server-side
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

  const onPaymentSuccess = (data) => {
    setPaymentResult({
      status: 'success',
      plan: data?.plan_name,
      amount: data?.amount,
      invoice: data?.invoice_number,
      invoice_id: data?.invoice_id,
      end_date: data?.end_date
    })
    setSelPlan(null); setSelGateway(null); setPayStep('select')
    api.get('/client/plan').then(r => { if (r.data.success) setCurrentPlan(r.data.data) }).catch(() => { })
    loadInvoices()
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

  const handleModalDownload = async () => {
    if (!paymentResult?.invoice_id) {
      // Try to find in loaded invoices by invoice number
      const found = invoices.find(inv => inv.invoice_number === paymentResult?.invoice)
      if (found) { handleDownload(found); return }
      return
    }
    try {
      const r = await downloadClientInvoice(paymentResult.invoice_id)
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${paymentResult.invoice || 'invoice'}.pdf`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { setError('Invoice download failed. Please try from the Invoice History table.') }
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
            <div className="flex overflow-x-auto gap-5 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-shrink-0 min-w-[300px] max-w-sm flex-1 bg-white rounded-2xl border border-gray-100 p-6 space-y-3 animate-pulse">
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
            <div className="flex overflow-x-auto gap-5 pb-4 snap-x snap-mandatory -mx-4 px-4 sm:-mx-6 sm:px-6">
              {plans.map(plan => {
                const isActive = currentPlan?.id === plan.id
                const isSelected = selPlan?.id === plan.id
                const price = planPrice(plan)
                const featureData = plan.plan_feature_data || []
                const enabledFeatures = featureData.filter(f => f.feature_key !== 'employees' && f.is_enabled)
                const disabledFeatures = featureData.filter(f => f.feature_key !== 'employees' && !f.is_enabled)

                return (
                  <div
                    key={plan.id}
                    onClick={() => handlePlanSelect(plan)}
                    className={`flex-shrink-0 min-w-[300px] max-w-sm flex-1 snap-start relative rounded-2xl border-2 p-6 cursor-pointer transition-all duration-200 hover:shadow-md
                      ${isSelected
                        ? 'border-amber-500 bg-amber-50 shadow-md'
                        : plan.is_highlighted
                          ? 'border-amber-300 bg-white shadow-sm'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-sm font-bold uppercase tracking-wide text-primary">{plan.name}</span>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {plan.is_highlighted && !isSelected && !isActive && <Badge color="amber">Popular</Badge>}
                        {isActive && <Badge color="green">Active</Badge>}
                        {isSelected && <Badge color="amber">Selected ✓</Badge>}
                      </div>
                    </div>

                    <div className="mb-1">
                      <span className="font-display text-3xl font-extrabold text-gray-900">{fmt(price)}</span>
                      <span className="font-body text-sm text-gray-400 ml-1">/{billing === 'yearly' ? 'yr' : 'mo'}</span>
                    </div>
                    <p className="font-body text-xs text-gray-400 mb-4">Up to {plan.max_users} employees</p>

                    <ul className="space-y-2 mb-5">
                      {ALWAYS_FREE.map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-body text-sm text-gray-600">{f}</span>
                        </li>
                      ))}
                      {enabledFeatures.map(f => {
                        const label = FEATURE_LABELS[f.feature_key] || f.feature_key
                        const limitText = f.monthly_limit
                          ? ` — ${f.monthly_limit} ${TOTAL_LIMIT_KEYS.has(f.feature_key) ? 'max' : '/mo'}`
                          : ''
                        return (
                          <li key={f.feature_key} className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-body text-sm text-gray-600">{label}{limitText}</span>
                          </li>
                        )
                      })}
                      {disabledFeatures.map(f => (
                        <li key={f.feature_key} className="flex items-center gap-2 opacity-50">
                          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span className="font-body text-sm line-through text-gray-400">{FEATURE_LABELS[f.feature_key] || f.feature_key}</span>
                        </li>
                      ))}
                    </ul>

                    <div className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors
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
                      <div className="grid grid-cols-5 gap-2">
                        {gateways.automatic.map(gw => (
                          <button
                            key={gw}
                            onClick={() => setSelGateway(gw)}
                            className={`flex items-center justify-center py-5 px-3 rounded-xl border-2 transition-all
                              ${selGateway === gw
                                ? 'border-amber-500 bg-amber-50 shadow-sm'
                                : 'border-gray-100 hover:border-amber-200 hover:bg-amber-50/30'}`}
                          >
                            <GatewayIcon name={gw} />
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
                      {/* Price summary */}
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

                      {/* PayPal renders its own button — all others use standard Pay button */}
                      {selGateway === 'paypal' ? (
                        <PayPalButtonContainer
                          plan={selPlan}
                          billing={billing}
                          onSuccess={onPaymentSuccess}
                          onError={(msg) => { setError(msg); setPayStep('select') }}
                        />
                      ) : (
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
                      )}
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

        {/* Payment Result Modal */}
        {paymentResult && (
          <PaymentResultModal
            result={paymentResult}
            onClose={() => setPaymentResult(null)}
            onDownload={handleModalDownload}
          />
        )}
      </div>
    </div>
  )
}

// ─── Payment Result Modal ─────────────────────────────────────────────────────
function PaymentResultModal({ result, onClose, onDownload }) {
  const isSuccess = result.status === 'success'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Top accent bar */}
        <div className={`h-1.5 ${isSuccess
          ? 'bg-gradient-to-r from-green-400 to-emerald-500'
          : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
        />

        <div className="p-8 text-center">

          {/* Icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5
            ${isSuccess ? 'bg-green-50' : 'bg-red-50'}`}>
            {isSuccess ? (
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
          </h2>

          {isSuccess ? (
            <>
              <p className="text-gray-400 text-sm mb-6">
                Your subscription is now active via {result.gateway?.charAt(0).toUpperCase() + result.gateway?.slice(1)}.
              </p>

              <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Plan Activated</span>
                  <span className="text-sm font-semibold text-gray-800">{result.plan}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Amount Paid</span>
                  <span className="text-sm font-semibold text-gray-800">
                    ₹{result.amount ? Number(result.amount).toLocaleString('en-IN') : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Invoice</span>
                  <span className="text-xs font-mono text-amber-600">{result.invoice || '—'}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                  <span className="text-sm text-gray-400">Valid Until</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {result.end_date
                      ? new Date(result.end_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })
                      : '—'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onDownload}
                  className="flex-1 py-2.5 border border-amber-200 text-amber-600 text-sm font-semibold
                             rounded-xl hover:bg-amber-50 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                  </svg>
                  Invoice PDF
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition"
                >
                  Continue
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm mb-1">
                {result.reason || 'Something went wrong with your payment.'}
              </p>
              <p className="text-gray-400 text-xs mb-6">No amount was charged to your account.</p>
              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition"
              >
                Try Another Method
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// ─── PayPal Button Container ───────────────────────────────────────────────────
// Loads PayPal JS SDK, renders official PayPal button, handles popup payment.
function PayPalButtonContainer({ plan, billing, onSuccess, onError }) {
  const containerRef  = useRef(null)
  const [loading, setLoading] = useState(true)
  const [sdkReady, setSdkReady] = useState(false)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const configRes = await api.get('/client/payment/paypal-config')
        if (!configRes.data.success) throw new Error(configRes.data.message || 'PayPal not configured')
        const { client_id } = configRes.data.data

        if (!window.paypal) {
          await new Promise((resolve, reject) => {
            const s = document.createElement('script')
            s.src = `https://www.paypal.com/sdk/js?client-id=${client_id}&currency=USD&intent=capture&disable-funding=credit,card`
            s.onload  = resolve
            s.onerror = () => reject(new Error('Failed to load PayPal SDK'))
            document.head.appendChild(s)
          })
        }

        if (!mounted) return
        setLoading(false)
        setSdkReady(true)
      } catch (err) {
        if (mounted) { setLoading(false); onError(err.message) }
      }
    }

    init()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.paypal) return

    window.paypal.Buttons({
      style: { shape: 'rect', color: 'gold', layout: 'horizontal', label: 'pay', height: 44 },

      createOrder: async () => {
        const res = await createPaymentOrder({ plan_id: plan.id, billing_type: billing, gateway: 'paypal' })
        if (!res.data.success) throw new Error(res.data.message || 'Could not create PayPal order')
        return res.data.data.order_id
      },

      onApprove: async (data) => {
        try {
          const vd = await verifyPaymentApi({
            gateway:      'paypal',
            order_id:     data.orderID,
            payment_id:   data.payerID,
            plan_id:      plan.id,
            billing_type: billing
          })
          if (vd.data.success) onSuccess(vd.data.data)
          else onError(vd.data.message || 'PayPal verification failed')
        } catch (e) {
          onError('PayPal verification error. Please contact support.')
        }
      },

      onError: () => {
        onError('PayPal encountered an error. Please try another payment method.')
      },

      onCancel: () => {
        // User closed PayPal popup — no error, just dismiss silently
      }
    }).render(containerRef.current)
  }, [sdkReady])

  return (
    <div className="mt-2">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-gray-400">
          <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading PayPal...</span>
        </div>
      ) : (
        <div ref={containerRef} />
      )}
    </div>
  )
}

function GatewayIcon({ name }) {
  // Payment gateway brand logos — images from public/logos/
  const logoMap = {
    razorpay: '/logos/razorpay.png',
    cashfree: '/logos/cashfree.png',
    paypal: '/logos/paypal.png',
    payu: '/logos/payu.png',
    paytm: '/logos/paytm.png',
  }

  if (logoMap[name]) {
    return (
      <img
        src={logoMap[name]}
        alt={name}
        className="h-9 w-auto max-w-[100px] object-contain"
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    )
  }

  // UPI — phone + QR code icon
  if (name === 'upi') {
    return (
      <svg className="w-10 h-10" viewBox="0 0 56 40" fill="none">
        {/* Phone */}
        <rect x="1" y="1" width="20" height="33" rx="3"
          stroke="#374151" strokeWidth="1.6" />
        <line x1="5" y1="7" x2="17" y2="7"
          stroke="#374151" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="5" y1="10" x2="13" y2="10"
          stroke="#374151" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="11" cy="22" r="5"
          stroke="#374151" strokeWidth="1.5" />
        <path d="M8.5 22l2 2 3.5-3.5"
          stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* QR Code */}
        <rect x="28" y="3" width="27" height="27" rx="2"
          stroke="#374151" strokeWidth="1.6" />
        {/* Top-left square */}
        <rect x="31" y="6" width="6" height="6" rx="1"
          stroke="#374151" strokeWidth="1.4" />
        <rect x="33" y="8" width="2" height="2" fill="#374151" />
        {/* Top-right square */}
        <rect x="46" y="6" width="6" height="6" rx="1"
          stroke="#374151" strokeWidth="1.4" />
        <rect x="48" y="8" width="2" height="2" fill="#374151" />
        {/* Bottom-left square */}
        <rect x="31" y="21" width="6" height="6" rx="1"
          stroke="#374151" strokeWidth="1.4" />
        <rect x="33" y="23" width="2" height="2" fill="#374151" />
        {/* QR dots */}
        <rect x="39" y="6" width="2" height="2" rx="0.3" fill="#374151" />
        <rect x="42" y="6" width="2" height="2" rx="0.3" fill="#374151" />
        <rect x="39" y="10" width="2" height="2" rx="0.3" fill="#374151" />
        <rect x="42" y="13" width="2" height="2" rx="0.3" fill="#374151" />
        <rect x="39" y="13" width="2" height="2" rx="0.3" fill="#374151" />
        <rect x="46" y="21" width="2" height="2" rx="0.3" fill="#374151" />
        <rect x="50" y="21" width="2" height="2" rx="0.3" fill="#374151" />
        <rect x="46" y="25" width="6" height="2" rx="0.5" fill="#374151" />
        <rect x="39" y="21" width="2" height="6" rx="0.3" fill="#374151" />
        <rect x="43" y="23" width="2" height="2" rx="0.3" fill="#374151" />
      </svg>
    )
  }

  // Net Banking — bank building icon
  if (name === 'netbanking') {
    return (
      <svg className="w-10 h-10" viewBox="0 0 48 44" fill="none"
        stroke="#374151" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {/* Roof */}
        <polyline points="2,17 24,4 46,17" />
        <line x1="2" y1="17" x2="46" y2="17" />
        {/* Columns */}
        <line x1="8" y1="20" x2="8" y2="35" />
        <line x1="15" y1="20" x2="15" y2="35" />
        <line x1="24" y1="20" x2="24" y2="35" />
        <line x1="33" y1="20" x2="33" y2="35" />
        <line x1="40" y1="20" x2="40" y2="35" />
        {/* Base */}
        <line x1="2" y1="35" x2="46" y2="35" />
        <line x1="1" y1="38" x2="47" y2="38" />
        <rect x="1" y="38" width="46" height="3" rx="1"
          fill="#374151" stroke="none" />
      </svg>
    )
  }

  // Fallback
  return (
    <svg className="w-8 h-8" fill="none" stroke="#9ca3af" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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