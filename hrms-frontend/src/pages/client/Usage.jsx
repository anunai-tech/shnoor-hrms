import { useState, useEffect } from 'react'
import api from '../../services/api'

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Usage</h1>
        <p className="font-body text-sm text-gray-500 mt-1">Your current resource usage vs plan limits</p>
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

      {totalStaff >= maxUsers * 0.8 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-display text-sm font-semibold text-red-800">Approaching Plan Limit</p>
          <p className="font-body text-xs text-red-600 mt-1">
            You're using {((totalStaff / maxUsers) * 100).toFixed(0)}% of your user limit. Consider upgrading your plan.
          </p>
        </div>
      )}
    </div>
  )
}

export default Usage