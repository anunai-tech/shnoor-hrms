import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import { suspendCompany } from '../../services/superadminService'

const FEATURE_META = {
  employees:       { label: 'Max Employees',          hasLimit: true,  limitLabel: 'Max employees',         limitType: 'total' },
  holidays:        { label: 'Holidays',               hasLimit: true,  limitLabel: 'Max active holidays',   limitType: 'total' },
  policies:        { label: 'Company Policies',       hasLimit: true,  limitLabel: 'Max active policies',   limitType: 'total' },
  expenses:        { label: 'Expense Management',     hasLimit: true,  limitLabel: 'Submissions/month',     limitType: 'monthly' },
  salary_payslips: { label: 'Salary & Payslips',      hasLimit: true,  limitLabel: 'Payslips/month',        limitType: 'monthly' },
  letters:         { label: 'HR Letters',             hasLimit: true,  limitLabel: 'Letters/month',         limitType: 'monthly' },
  offboarding:     { label: 'Offboarding & Complaints', hasLimit: false, limitLabel: null,                  limitType: null },
  messaging:       { label: 'Internal Messaging',     hasLimit: true,  limitLabel: 'Messages/month',        limitType: 'monthly' },
  branding:        { label: 'Custom Branding',        hasLimit: false, limitLabel: null,                    limitType: null },
}

const ALWAYS_ENABLED = new Set(['employees', 'holidays', 'policies'])

function UsageBar({ label, used, limit, warning }) {
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="font-display text-xs font-medium text-gray-600">{label}</span>
        <span className={`font-body text-xs font-semibold ${warning ? 'text-amber-600' : 'text-gray-500'}`}>
          {used !== null ? `${used} / ${limit ?? '∞'}` : '—'}
        </span>
      </div>
      {limit && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${warning ? 'bg-amber-400' : 'bg-amber-300'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

function CompanyDrawer({ companyId, onClose, onAction }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showTerminate, setShowTerminate] = useState(false)
  const [terminateReason, setTerminateReason] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [showSuspend, setShowSuspend] = useState(false)

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    api.get(`/superadmin/companies/${companyId}/usage`)
      .then(r => { if (r.data.success) setData(r.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [companyId])

  const handleSuspend = async () => {
    setActionLoading(true)
    try {
      const action = data?.company_status === 'suspended' ? 'activate' : 'suspend'
      await suspendCompany(companyId, action)
      onAction()
      onClose()
    } catch (err) { console.error(err) } finally { setActionLoading(false) }
  }

  const handleTerminate = async () => {
    if (!terminateReason.trim()) return
    setActionLoading(true)
    try {
      await api.put(`/superadmin/companies/${companyId}/terminate-plan`, { reason: terminateReason })
      onAction()
      onClose()
    } catch (err) { console.error(err) } finally { setActionLoading(false) }
  }

  const isSuspended = data?.company_status === 'suspended'

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <p className="font-display text-base font-bold text-gray-800">Company Details</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-7 h-7 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Company info */}
            <div className="space-y-1">
              <p className="font-display text-lg font-bold text-gray-800">{data.company_name}</p>
              <p className="font-body text-sm text-gray-400">{data.company_email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-display text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                  {data.plan_name}
                </span>
                <span className={`font-display text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isSuspended ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                }`}>
                  {data.company_status || 'active'}
                </span>
              </div>
            </div>

            {/* Subscription dates */}
            {data.start_date && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="font-display text-xs font-semibold text-gray-500 uppercase tracking-wide">Subscription</p>
                <div className="flex justify-between">
                  <span className="font-body text-xs text-gray-500">Start</span>
                  <span className="font-display text-xs font-medium text-gray-700">
                    {new Date(data.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-xs text-gray-500">Expiry</span>
                  <span className="font-display text-xs font-medium text-gray-700">
                    {new Date(data.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body text-xs text-gray-500">Billing</span>
                  <span className="font-display text-xs font-medium text-gray-700 capitalize">{data.billing_type || '—'}</span>
                </div>
              </div>
            )}

            {/* Feature usage */}
            <div className="space-y-4">
              <p className="font-display text-xs font-semibold text-gray-500 uppercase tracking-wide">Resource Usage</p>
              {Object.entries(data.features || {}).map(([key, feat]) => {
                if (!feat.enabled) return null
                const meta = FEATURE_META[key]
                if (!meta || (!feat.limit && feat.used === null)) return null
                return (
                  <UsageBar
                    key={key}
                    label={meta.label}
                    used={feat.used}
                    limit={feat.limit}
                    warning={feat.warning}
                  />
                )
              })}
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <p className="font-display text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</p>

              {!showSuspend ? (
                <button
                  onClick={() => setShowSuspend(true)}
                  className={`font-display w-full py-2.5 text-sm font-semibold rounded-lg transition ${
                    isSuspended ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-red-50 text-red-500 hover:bg-red-100'
                  }`}
                >
                  {isSuspended ? 'Activate Company' : 'Suspend Company'}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="font-body text-xs text-gray-500">
                    {isSuspended ? 'Reactivate this company?' : 'Reason for suspension (optional)'}
                  </p>
                  {!isSuspended && (
                    <input value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
                      placeholder="e.g. Payment overdue"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                  )}
                  <div className="flex gap-2">
                    <button onClick={handleSuspend} disabled={actionLoading}
                      className={`font-display flex-1 py-2 text-sm font-semibold rounded-lg transition disabled:opacity-50 ${
                        isSuspended ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                      Confirm
                    </button>
                    <button onClick={() => setShowSuspend(false)}
                      className="font-display flex-1 py-2 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!showTerminate ? (
                <button onClick={() => setShowTerminate(true)}
                  className="font-display w-full py-2.5 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
                  Terminate Plan
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="font-body text-xs text-gray-500">Reason for termination (required)</p>
                  <textarea value={terminateReason} onChange={e => setTerminateReason(e.target.value)}
                    placeholder="e.g. Subscription expired, no renewal"
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={handleTerminate} disabled={actionLoading || !terminateReason.trim()}
                      className="font-display flex-1 py-2 text-sm font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
                      Confirm
                    </button>
                    <button onClick={() => setShowTerminate(false)}
                      className="font-display flex-1 py-2 text-sm font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="font-body text-sm text-gray-400 text-center mt-10">Failed to load company data.</p>
        )}
      </div>
    </div>
  )
}

function FeatureRow({ subscriptionId, featureKey, config, onSaved }) {
  const meta = FEATURE_META[featureKey]
  const [enabled, setEnabled] = useState(config.is_enabled)
  const [limit, setLimit] = useState(config.monthly_limit ?? '')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const alwaysOn = ALWAYS_ENABLED.has(featureKey)

  const handleToggle = () => { if (alwaysOn) return; setEnabled(v => !v); setDirty(true) }
  const handleLimit = e => { setLimit(e.target.value); setDirty(true) }

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/superadmin/plan-features/${subscriptionId}/${featureKey}`, {
        is_enabled: enabled,
        monthly_limit: limit === '' ? null : parseInt(limit)
      })
      setDirty(false)
      onSaved()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  return (
    <div className={`flex items-center justify-between py-3 border-b border-gray-50 last:border-0 ${!enabled && !alwaysOn ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={handleToggle}
          className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
            enabled ? 'bg-amber-400' : 'bg-gray-200'
          } ${alwaysOn ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'left-5' : 'left-0.5'}`} />
        </button>
        <span className="font-display text-sm font-medium text-gray-700">{meta?.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {meta?.hasLimit && (
          <input
            type="number"
            value={limit}
            onChange={handleLimit}
            min={0}
            placeholder="—"
            className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        )}
        {dirty && (
          <button onClick={save} disabled={saving}
            className="font-display text-xs bg-amber-400 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold transition disabled:opacity-50">
            {saving ? '...' : 'Save'}
          </button>
        )}
      </div>
    </div>
  )
}

function PlansTab() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/superadmin/plan-features')
      .then(r => { if (r.data.success) setPlans(r.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-7 h-7 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {plans.map(plan => (
        <div key={plan.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-display text-base font-bold text-gray-800">{plan.name}</p>
            <p className="font-body text-xs text-gray-400 mt-0.5">
              ₹{Number(plan.monthly_price).toLocaleString('en-IN')}/mo · ₹{Number(plan.annual_price).toLocaleString('en-IN')}/yr
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="font-body text-xs text-gray-400 uppercase tracking-wide">Feature</span>
              <span className="ml-auto font-body text-xs text-gray-400 uppercase tracking-wide">Limit</span>
            </div>
          </div>
          <div className="px-5 py-1">
            {Object.entries(FEATURE_META).map(([key]) => (
              <FeatureRow
                key={key}
                subscriptionId={plan.id}
                featureKey={key}
                config={plan.features?.[key] || { is_enabled: true, monthly_limit: null }}
                onSaved={load}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CompaniesTab() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [drawerCompanyId, setDrawerCompanyId] = useState(null)
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get('/superadmin/companies')
      .then(r => { if (r.data.success) setCompanies(r.data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = companies.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search company name or email..."
        className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-7 h-7 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  {['#', 'Company', 'Plan', 'Status', 'Subdomain', 'Actions'].map(h => (
                    <th key={h} className="font-display text-left px-6 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" className="font-body text-center py-10 text-sm text-gray-400">No companies found</td></tr>
                ) : filtered.map((c, i) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="font-body px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4">
                      <p className="font-display text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="font-body text-xs text-gray-400">{c.email}</p>
                    </td>
                    <td className="font-display px-6 py-4 text-sm font-medium text-gray-600">
                      {c.subscription_name || 'No plan'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-display text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                        c.status === 'active' ? 'bg-green-50 text-green-600' :
                        c.status === 'suspended' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'
                      }`}>{c.status || 'pending'}</span>
                    </td>
                    <td className="font-body px-6 py-4 text-sm text-gray-500">{c.subdomain || '—'}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => setDrawerCompanyId(c.id)}
                        className="font-display text-xs text-amber-600 hover:text-amber-800 font-semibold transition">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-gray-100">
              <p className="font-body text-xs text-gray-400">{filtered.length} of {companies.length} companies</p>
            </div>
          </div>
        )}
      </div>

      {drawerCompanyId && (
        <CompanyDrawer
          companyId={drawerCompanyId}
          onClose={() => setDrawerCompanyId(null)}
          onAction={load}
        />
      )}
    </div>
  )
}

export default function PlanManagement() {
  const [activeTab, setActiveTab] = useState('plans')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Plan Management</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Configure plan features, limits, and monitor company usage</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[{ key: 'plans', label: 'Plans & Features' }, { key: 'companies', label: 'Companies' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`font-display px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              activeTab === tab.key ? 'border-yellow-400 text-yellow-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'plans' ? <PlansTab /> : <CompaniesTab />}
    </div>
  )
}