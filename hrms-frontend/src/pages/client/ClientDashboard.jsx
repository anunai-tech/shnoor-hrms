import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useNavigate } from 'react-router-dom'

function ClientDashboard() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        api.get('/client/dashboard')
            .then(res => setData(res.data.data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <p className="font-body text-gray-400 text-sm">Loading dashboard...</p>
        </div>
    )

    const { company, stats, subdomainRequest, portalActive } = data || {}

    const getPortalSection = () => {
        if (portalActive) {
            return (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                            Portal Active
                        </span>
                    </div>
                    <p className="font-body text-sm text-gray-500 mb-4">
                        Your company portal is live and operational.
                    </p>
                    <div className="grid grid-cols-2 gap-3">

                        <a href={`http://${company?.subdomain}.shnoor.com`} target="_blank" rel="noreferrer" className="font-display flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            Portal Homepage
                        </a>

                        <a href={`http://${company?.subdomain}.shnoor.com/login`} target="_blank" rel="noreferrer" className="font-display flex items-center justify-center gap-2 bg-primary text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition">
                            Admin Login
                        </a>
                    </div>
                </div >
            )
        }

        if (subdomainRequest?.status === 'pending') {
            return (
                <div>
                    <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 inline-block"></span>
                        Subdomain Request Pending
                    </span>
                    <p className="font-body text-sm text-gray-500 mt-2">
                        Your request for <span className="font-semibold text-gray-700">{subdomainRequest.requested_subdomain}.shnoor.com</span> is under review. We'll notify you once approved.
                    </p>
                </div>
            )
        }

        if (subdomainRequest?.status === 'rejected') {
            return (
                <div>
                    <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                        Request Rejected
                    </span>
                    <p className="font-body text-sm text-gray-500 mt-2 mb-4">
                        {subdomainRequest.rejection_reason || 'Your subdomain request was rejected.'}
                    </p>
                    <button
                        onClick={() => navigate('/client/settings')}
                        className="font-display text-sm bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
                    >
                        Request New Subdomain
                    </button>
                </div>
            )
        }

        return (
            <div>
                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                    Not Configured
                </span>
                <p className="font-body text-sm text-gray-500 mt-2 mb-4">
                    Set up your company portal to give your team their own login page.
                </p>
                <button
                    onClick={() => navigate('/client/settings')}
                    className="font-display text-sm bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
                >
                    Setup Your Portal
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-display text-2xl font-bold text-gray-800">Dashboard</h1>
                <p className="font-body text-sm text-gray-500 mt-1">Welcome back, {company?.display_name || company?.name}</p>
            </div>

            {/* Account Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-display text-base font-semibold text-gray-800 mb-4">Account Status</h2>
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-lg">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"></div>
                    <div>
                        <p className="font-display text-sm font-semibold text-green-800">Account Active</p>
                        <p className="font-body text-xs text-green-600 mt-0.5">Your account is active and ready to use.</p>
                    </div>
                </div>
            </div>

            {/* Company Portal */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="font-display text-base font-semibold text-gray-800 mb-4">Company Portal</h2>
                {getPortalSection()}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="font-body text-xs text-gray-400 uppercase tracking-wide mb-1">Total Managers</p>
                    <p className="font-display text-3xl font-bold text-gray-800">{stats?.managers ?? 0}</p>
                    <span className="font-body text-xs text-green-600 font-medium">Active</span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="font-body text-xs text-gray-400 uppercase tracking-wide mb-1">Total Employees</p>
                    <p className="font-display text-3xl font-bold text-gray-800">{stats?.employees ?? 0}</p>
                    <span className="font-body text-xs text-green-600 font-medium">Active</span>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="font-body text-xs text-gray-400 uppercase tracking-wide mb-1">Member Since</p>
                    <p className="font-display text-xl font-bold text-gray-800">
                        {company?.created_at ? new Date(company.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                    </p>
                    <span className="font-body text-xs text-gray-400">Joined</span>
                </div>
            </div>
        </div>
    )
}

export default ClientDashboard