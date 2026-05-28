// Superadmin invoice management — two tabs: all invoices with PDF download,
// and pending manual payments awaiting verification or rejection.

import { useState, useEffect } from 'react'
import api from '../../services/api'
import { getInvoices, downloadInvoicePDF, getWebsiteSettings, updateWebsiteSettings } from '../../services/superadminService'

function Badge({ status }) {
  const styles = {
    paid: 'bg-green-50 text-green-600',
    pending: 'bg-yellow-50 text-yellow-600',
    failed: 'bg-red-50 text-red-500',
    cancelled: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium capitalize ${styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function GatewayBadge({ gateway }) {
  const labels = {
    razorpay: 'Razorpay', cashfree: 'Cashfree', payu: 'PayU',
    paytm: 'Paytm', paypal: 'PayPal', upi: 'UPI', netbanking: 'Netbanking'
  }
  return (
    <span className="font-body text-xs text-gray-500 capitalize">
      {labels[gateway] || gateway || 'Manual'}
    </span>
  )
}

function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <p className="font-display text-base font-semibold text-gray-800 mb-2">Are you sure?</p>
        <p className="font-body text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className={`font-display flex-1 text-white text-sm font-semibold py-2.5 rounded-lg transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-yellow-400 hover:bg-yellow-500'}`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function AllInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [companyFilter, setCompanyFilter] = useState('All')
  const [downloading, setDownloading] = useState(null)

  useEffect(() => { fetchInvoices() }, [])

  const fetchInvoices = async () => {
    try {
      const res = await getInvoices()
      setInvoices(res.data.data || [])
    } catch (err) {
      console.error('fetchInvoices error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Extract unique company names from loaded invoices for the filter dropdown.
  const companies = ['All', ...new Set(invoices.map(i => i.company_name).filter(Boolean))]

  const filtered = invoices.filter(inv =>
    companyFilter === 'All' || inv.company_name === companyFilter
  )

  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.total_amount || 0), 0)
  const thisMonth = invoices.filter(i => {
    const d = new Date(i.generated_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  // Fetch PDF as blob and trigger browser download — auth header required.
  const handleDownload = async (invoice) => {
    setDownloading(invoice.id)
    try {
      const res = await downloadInvoicePDF(invoice.id)
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <p className="font-body text-gray-400 text-sm">Loading invoices...</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="font-body text-xs text-gray-400 font-medium uppercase tracking-wide">Total Revenue</p>
          <p className="font-display text-2xl font-bold text-gray-800 mt-2">
            ₹{totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="font-body text-xs text-gray-400 font-medium uppercase tracking-wide">Total Invoices</p>
          <p className="font-display text-2xl font-bold text-gray-800 mt-2">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="font-body text-xs text-gray-400 font-medium uppercase tracking-wide">This Month</p>
          <p className="font-display text-2xl font-bold text-yellow-500 mt-2">{thisMonth}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
          <p className="font-display text-sm font-semibold text-gray-700">
            All Invoices
          </p>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body"
          >
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="font-display text-left px-6 py-3 font-medium">#</th>
                <th className="font-display text-left px-6 py-3 font-medium">Invoice No</th>
                <th className="font-display text-left px-6 py-3 font-medium">Company</th>
                <th className="font-display text-left px-6 py-3 font-medium">Plan</th>
                <th className="font-display text-left px-6 py-3 font-medium">Billing</th>
                <th className="font-display text-left px-6 py-3 font-medium">Total</th>
                <th className="font-display text-left px-6 py-3 font-medium">Gateway</th>
                <th className="font-display text-left px-6 py-3 font-medium">Date</th>
                <th className="font-display text-left px-6 py-3 font-medium">Download</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="font-body text-center py-12 text-sm text-gray-400">
                    No invoices yet. Invoices are generated automatically after each successful payment.
                  </td>
                </tr>
              ) : (
                filtered.map((inv, index) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="font-display px-6 py-4 text-sm font-medium text-gray-800">
                      {inv.invoice_number}
                    </td>
                    <td className="font-display px-6 py-4 text-sm font-medium text-gray-700">
                      {inv.company_name}
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{inv.plan_name}</td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500 capitalize">
                      {inv.billing_type}
                    </td>
                    <td className="font-display px-6 py-4 text-sm font-semibold text-gray-800">
                      {inv.currency === 'USD' ? '$' : '₹'}
                      {Number(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4"><GatewayBadge gateway={inv.gateway_used} /></td>
                    <td className="font-body px-6 py-4 text-sm text-gray-400">
                      {new Date(inv.generated_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDownload(inv)}
                        disabled={downloading === inv.id}
                        className="font-display text-xs text-yellow-600 hover:text-yellow-700 font-semibold disabled:opacity-50 transition"
                      >
                        {downloading === inv.id ? 'Downloading...' : 'Download PDF'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="font-body text-xs text-gray-400">
            Showing {filtered.length} of {invoices.length} invoices
          </p>
        </div>
      </div>
    </div>
  )
}

function PendingVerification({ onVerified }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { fetchPending() }, [])

  const fetchPending = async () => {
    try {
      const res = await getPendingPayments()
      setPayments(res.data.data || [])
    } catch (err) {
      console.error('fetchPending error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (id) => {
    setProcessing(id)
    try {
      await verifyManualPayment(id)
      setPayments(prev => prev.filter(p => p.id !== id))
      if (onVerified) onVerified()
    } catch (err) {
      console.error('verifyManualPayment error:', err)
    } finally {
      setProcessing(null)
      setConfirm(null)
    }
  }

  const handleReject = async (id) => {
    setProcessing(id)
    try {
      await rejectManualPayment(id)
      setPayments(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      console.error('rejectManualPayment error:', err)
    } finally {
      setProcessing(null)
      setConfirm(null)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <p className="font-body text-gray-400 text-sm">Loading pending payments...</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {payments.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <p className="font-display text-sm font-semibold text-amber-800">
            {payments.length} payment{payments.length > 1 ? 's' : ''} awaiting verification
          </p>
          <p className="font-body text-xs text-amber-600 mt-1">
            Cross-check each payment against your bank statement or UPI history before verifying.
            Verifying activates the client's subscription immediately.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="font-display text-left px-6 py-3 font-medium">#</th>
                <th className="font-display text-left px-6 py-3 font-medium">Company</th>
                <th className="font-display text-left px-6 py-3 font-medium">Plan</th>
                <th className="font-display text-left px-6 py-3 font-medium">Amount</th>
                <th className="font-display text-left px-6 py-3 font-medium">Billing</th>
                <th className="font-display text-left px-6 py-3 font-medium">Gateway</th>
                <th className="font-display text-left px-6 py-3 font-medium">Reference</th>
                <th className="font-display text-left px-6 py-3 font-medium">Submitted</th>
                <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="font-body text-center py-12 text-sm text-gray-400">
                    No payments pending verification. All manual payments are up to date.
                  </td>
                </tr>
              ) : (
                payments.map((p, index) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="font-display px-6 py-4 text-sm font-medium text-gray-800">
                      {p.company_name}
                      <p className="font-body text-xs text-gray-400 font-normal">{p.company_email}</p>
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{p.plan}</td>
                    <td className="font-display px-6 py-4 text-sm font-semibold text-gray-800">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500 capitalize">
                      {p.billing_type}
                    </td>
                    <td className="px-6 py-4"><GatewayBadge gateway={p.gateway} /></td>
                    <td className="font-body px-6 py-4 text-xs text-gray-400">
                      {p.gateway_order_id || '—'}
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-400">
                      {new Date(p.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirm({ type: 'verify', id: p.id, company: p.company_name })}
                          disabled={processing === p.id}
                          className="font-display text-xs bg-green-50 text-green-600 hover:bg-green-100 font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          Verify
                        </button>
                        <button
                          onClick={() => setConfirm({ type: 'reject', id: p.id, company: p.company_name })}
                          disabled={processing === p.id}
                          className="font-display text-xs bg-red-50 text-red-500 hover:bg-red-100 font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="font-body text-xs text-gray-400">
            {payments.length} pending verification
          </p>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          message={
            confirm.type === 'verify'
              ? `Verify payment from ${confirm.company}? This will activate their subscription immediately.`
              : `Reject payment from ${confirm.company}? This cannot be undone.`
          }
          confirmLabel={confirm.type === 'verify' ? 'Yes, Verify' : 'Yes, Reject'}
          danger={confirm.type === 'reject'}
          onConfirm={() =>
            confirm.type === 'verify'
              ? handleVerify(confirm.id)
              : handleReject(confirm.id)
          }
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

function InvoiceSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    invoice_company_name: '',
    invoice_address: '',
    invoice_rep_office: '',
    invoice_email: '',
    invoice_phone: '',
    invoice_website: '',
    invoice_gstin: '',
    gst_rate: 18,
    invoice_prefix: 'SHNOOR-INV',
  })

  useEffect(() => {
    getWebsiteSettings()
      .then(res => {
        if (res.data.data) {
          const d = res.data.data
          setForm(prev => ({
            ...prev,
            invoice_company_name: d.invoice_company_name || '',
            invoice_address: d.invoice_address || '',
            invoice_rep_office: d.invoice_rep_office || '',
            invoice_email: d.invoice_email || '',
            invoice_phone: d.invoice_phone || '',
            invoice_website: d.invoice_website || '',
            invoice_gstin: d.invoice_gstin || '',
            gst_rate: d.gst_rate || 18,
            invoice_prefix: d.invoice_prefix || 'SHNOOR-INV',
          }))
        }
      })
      .catch(() => setError('Failed to load invoice settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // Fetch current website settings first to preserve other fields.
      const current = await getWebsiteSettings()
      const merged = { ...current.data.data, ...form }
      await updateWebsiteSettings(merged)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <p className="font-body text-gray-400 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
        <p className="font-body text-xs text-blue-700">
          These details appear on every generated invoice PDF. Changes take effect on the next invoice generated.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Company Legal Name</label>
            <input name="invoice_company_name" value={form.invoice_company_name} onChange={handleChange}
              placeholder="SHNOOR International LLC"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body" />
          </div>
          <div>
            <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Invoice Email</label>
            <input name="invoice_email" value={form.invoice_email} onChange={handleChange}
              placeholder="vivek@shnoor.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body" />
          </div>
          <div className="sm:col-span-2">
            <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Head Office Address</label>
            <input name="invoice_address" value={form.invoice_address} onChange={handleChange}
              placeholder="10009 Mount Tabor Road, Odessa, Missouri, USA"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body" />
          </div>
          <div className="sm:col-span-2">
            <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Representative Office</label>
            <input name="invoice_rep_office" value={form.invoice_rep_office} onChange={handleChange}
              placeholder="Building No. 25, Al Khuwair St, Muscat 133, Oman"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body" />
          </div>
          <div>
            <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Phone</label>
            <input name="invoice_phone" value={form.invoice_phone} onChange={handleChange}
              placeholder="+968-98764627 (Oman)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body" />
          </div>
          <div>
            <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Website</label>
            <input name="invoice_website" value={form.invoice_website} onChange={handleChange}
              placeholder="www.shnoor.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body" />
          </div>
          <div>
            <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">GSTIN (optional)</label>
            <input name="invoice_gstin" value={form.invoice_gstin} onChange={handleChange}
              placeholder="Leave blank if not applicable"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body" />
          </div>
          <div>
            <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Invoice Number Prefix</label>
            <input name="invoice_prefix" value={form.invoice_prefix} onChange={handleChange}
              placeholder="SHNOOR-INV"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body" />
          </div>
          <div>
            <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">GST Rate (%)</label>
            <input name="gst_rate" type="number" min="0" max="100"
              value={form.gst_rate} onChange={handleChange}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 font-body" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {saved && <p className="font-body text-sm text-green-600">Invoice settings saved.</p>}
            {error && <p className="font-body text-sm text-red-500">{error}</p>}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="font-display bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Invoice Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Invoices() {
  const [activeTab, setActiveTab] = useState('invoices')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Invoices</h1>
        <p className="font-body text-sm text-gray-400 mt-1">
          Invoice history and manual payment verification
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'invoices', label: 'All Invoices' },
          { key: 'settings', label: 'Invoice Settings' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-display px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              activeTab === tab.key
                ? 'border-yellow-400 text-yellow-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && <AllInvoices />}
      {activeTab === 'settings' && <InvoiceSettings />}
    </div>
  )
}

export default Invoices