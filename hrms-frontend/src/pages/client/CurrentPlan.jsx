import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'

import { usePlan } from '../../context/PlanContext'

function CurrentPlan() {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { features, planName } = usePlan()

  useEffect(() => {
    api.get('/client/plan')
      .then(res => setPlan(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="font-body text-gray-400 text-sm">Loading plan details...</p>
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Current Plan</h1>
        <p className="font-body text-sm text-gray-500 mt-1">Your active subscription details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Plan Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-display text-base font-semibold text-gray-700 mb-4">Plan Information</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="font-body text-sm text-gray-500">Plan Name</span>
              <span className="font-display text-sm font-semibold text-gray-800">{plan?.name || 'Starter'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="font-body text-sm text-gray-500">Monthly Price</span>
              <span className="font-display text-sm font-semibold text-gray-800">
                {plan?.monthly_price ? `₹${Number(plan.monthly_price).toLocaleString('en-IN')}` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="font-body text-sm text-gray-500">Annual Price</span>
              <span className="font-display text-sm font-semibold text-gray-800">
                {plan?.annual_price ? `₹${Number(plan.annual_price).toLocaleString('en-IN')}` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-body text-sm text-gray-500">Max Users</span>
              <span className="font-display text-sm font-semibold text-gray-800">{plan?.max_users || 50}</span>
            </div>
          </div>
        </div>

        {/* Subscription Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-display text-base font-semibold text-gray-700 mb-4">Subscription Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="font-body text-sm text-gray-500">Start Date</span>
              <span className="font-display text-sm font-semibold text-gray-800">
                {plan?.member_since ? new Date(plan.member_since).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="font-body text-sm text-gray-500">Billing Cycle</span>
              <span className="font-display text-sm font-semibold text-gray-800">Monthly</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="font-body text-sm text-gray-500">Status</span>
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Active
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="font-body text-sm text-gray-500">Billing Type</span>
              <span className="font-display text-sm font-semibold text-gray-800 capitalize">
                {plan?.billing_type || 'Monthly'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-body text-sm text-gray-500">Renewal Date</span>
              <span className={`font-display text-sm font-semibold ${plan?.end_date ? 'text-gray-800' : 'text-gray-400'}`}>
                {plan?.end_date
                  ? new Date(plan.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Included Features */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-display text-base font-semibold text-gray-700 mb-4">Included Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {features ? Object.entries(features).map(([key, feat]) => {
            const labels = {
              employees: 'Employee Management', holidays: 'Holidays', policies: 'Company Policies',
              expenses: 'Expense Management', salary_payslips: 'Salary & Payslips', letters: 'HR Letters',
              offboarding: 'Offboarding', messaging: 'Internal Messaging', branding: 'Custom Branding',
            }
            return (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${feat.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {feat.enabled ? (
                    <svg className="w-2.5 h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-2.5 h-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <span className={`font-body text-sm ${feat.enabled ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                  {labels[key] || key}
                  {feat.limit ? <span className="text-xs text-gray-400 ml-1">({feat.limit}{key === 'employees' ? ' max' : '/mo'})</span> : null}
                </span>
              </div>
            )
          }) : ['Employee Management','Attendance Tracking','Leave Management'].map(f => (
            <div key={f} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-body text-sm text-gray-700">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-center justify-between">
        <div>
          <p className="font-display text-sm font-semibold text-amber-800">Want more features or higher limits?</p>
          <p className="font-body text-xs text-amber-600 mt-0.5">Upgrade your plan to unlock more users and advanced features.</p>
        </div>
        <button
          onClick={() => window.location.href = '/client/billings'}
          className="font-display text-sm bg-primary text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition"
        >
          Upgrade Plan
        </button>
      </div>
    </div>
  )
}

export default CurrentPlan