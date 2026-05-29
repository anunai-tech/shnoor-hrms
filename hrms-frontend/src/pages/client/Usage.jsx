import { useState, useEffect } from 'react'
import api from '../../services/api'
import { usePlan } from '../../context/PlanContext'

function UsageBar({ label, used, max }) {
  const percent = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const isHigh = percent >= 80

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-display text-sm font-medium text-gray-700">{label}</span>
        <span className={`font-body text-sm font-semibold ${isHigh ? 'text-red-600' : 'text-gray-600'}`}>
          {used} / {max}
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-red-500' : 'bg-primary'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="font-body text-xs text-gray-400">{percent.toFixed(0)}% used</p>
    </div>
  )
}

function Usage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { features, planName } = usePlan()

  useEffect(() => {
    api.get('/client/usage')
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-body text-gray-400 text-sm">Loading usage...</p>
    </div>
  )

  const { maxUsers = 50, managers = 0, employees = 0, totalStaff = 0 } = data || {}

  const FEATURE_LABELS = {
    employees: 'Employees', holidays: 'Holidays', policies: 'Company Policies',
    expenses: 'Expenses (this month)', salary_payslips: 'Payslips (this month)',
    letters: 'Letters (this month)', messaging: 'Messages (this month)',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Usage</h1>
          <p className="font-body text-sm text-gray-500 mt-1">Your current resource usage vs plan limits</p>
        </div>
        {planName && (
          <span className="font-display text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full self-start">
            {planName} Plan
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="font-display text-3xl font-bold text-gray-800">{managers}</p>
          <p className="font-body text-sm text-gray-400 mt-1">Managers</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="font-display text-3xl font-bold text-gray-800">{employees}</p>
          <p className="font-body text-sm text-gray-400 mt-1">Employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <p className="font-display text-3xl font-bold text-primary">{maxUsers}</p>
          <p className="font-body text-sm text-gray-400 mt-1">Plan Limit</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="font-display text-base font-semibold text-gray-800">Resource Usage</h2>
        <UsageBar label="Managers" used={managers} max={maxUsers} />
        <UsageBar label="Employees" used={employees} max={maxUsers} />
        <UsageBar label="Total Staff" used={totalStaff} max={maxUsers} />
      </div>

      {/* Per-feature usage from PlanContext */}
      {features && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <h2 className="font-display text-base font-semibold text-gray-800">Plan Feature Usage</h2>
          {Object.entries(features).map(([key, feat]) => {
            if (!feat.enabled || feat.limit === null || feat.used === null) return null
            const label = FEATURE_LABELS[key]
            if (!label) return null
            const pct = feat.limit > 0 ? Math.min(Math.round((feat.used / feat.limit) * 100), 100) : 0
            return (
              <div key={key} className="space-y-1.5">
                {feat.warning && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-1">
                    <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <p className="font-body text-xs text-amber-700">
                      <span className="font-semibold">Approaching limit — </span>
                      {feat.remaining} remaining
                    </p>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-display text-sm font-medium text-gray-700">{label}</span>
                  <span className={`font-body text-sm font-semibold ${feat.warning ? 'text-amber-600' : 'text-gray-500'}`}>
                    {feat.used} / {feat.limit}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${feat.warning ? 'bg-amber-400' : 'bg-amber-300'}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <p className="font-body text-xs text-gray-400">{pct}% used</p>
              </div>
            )
          })}
        </div>
      )}

      {totalStaff >= maxUsers * 0.8 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-display text-sm font-semibold text-red-800">Approaching Employee Limit</p>
          <p className="font-body text-xs text-red-600 mt-1">
            You're using {((totalStaff / maxUsers) * 100).toFixed(0)}% of your employee limit. Consider upgrading.
          </p>
        </div>
      )}
    </div>
  )
}

export default Usage