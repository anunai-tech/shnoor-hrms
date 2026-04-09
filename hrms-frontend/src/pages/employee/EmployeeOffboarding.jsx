import { useState, useEffect } from 'react'
import { getMyOffboarding, submitResignation, getMyComplaints, raiseComplaint, getMyLetters } from '../../services/employeeService'
import { useAuth } from '../../context/AuthContext'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const STATUS_COLORS = {
  'Pending':     'bg-yellow-50 text-yellow-600',
  'Approved':    'bg-green-50 text-green-600',
  'Rejected':    'bg-red-50 text-red-500',
  'In Progress': 'bg-blue-50 text-blue-600',
  'Completed':   'bg-gray-100 text-gray-500',
  'Open':        'bg-yellow-50 text-yellow-600',
  'Under Review':'bg-blue-50 text-blue-600',
  'Resolved':    'bg-green-50 text-green-600',
  'Closed':      'bg-gray-100 text-gray-500',
}

function EmployeeOffboarding() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('status')
  const [offboarding, setOffboarding] = useState([])
  const [complaints, setComplaints] = useState([])
  const [warnings, setWarnings] = useState([])
  const [loading, setLoading] = useState(true)

  // Resignation modal
  const [showResignModal, setShowResignModal] = useState(false)
  const [resignForm, setResignForm] = useState({ reason: '', last_working_day: '' })
  const [resignError, setResignError] = useState('')
  const [resignSaving, setResignSaving] = useState(false)

  // Complaint modal
  const [showComplaintModal, setShowComplaintModal] = useState(false)
  const [complaintForm, setComplaintForm] = useState({ title: '', description: '' })
  const [complaintError, setComplaintError] = useState('')
  const [complaintSaving, setComplaintSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [offRes, compRes, letRes] = await Promise.all([
        getMyOffboarding(), getMyComplaints(), getMyLetters()
      ])
      setOffboarding(offRes.data.data || [])
      setComplaints(compRes.data.data || [])
      // Warnings are letters of type Warning Letter
      setWarnings((letRes.data.data || []).filter(l => l.letter_type === 'Warning Letter'))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleResign = async () => {
    setResignError('')
    if (!resignForm.reason) { setResignError('Please provide a reason.'); return }
    setResignSaving(true)
    try {
      await submitResignation(resignForm)
      setShowResignModal(false)
      setResignForm({ reason: '', last_working_day: '' })
      fetchAll()
    } catch (err) {
      setResignError(err.response?.data?.message || 'Failed to submit resignation.')
    } finally { setResignSaving(false) }
  }

  const handleComplaint = async () => {
    setComplaintError('')
    if (!complaintForm.title || !complaintForm.description) { setComplaintError('Please fill all fields.'); return }
    setComplaintSaving(true)
    try {
      await raiseComplaint(complaintForm)
      setShowComplaintModal(false)
      setComplaintForm({ title: '', description: '' })
      fetchAll()
    } catch (err) {
      setComplaintError('Failed to submit complaint.')
    } finally { setComplaintSaving(false) }
  }

  // Get current offboarding status
  const activeOffboarding = offboarding.find(o => o.status !== 'Rejected' && o.status !== 'Completed')
  const statusLabel = activeOffboarding ? activeOffboarding.status : 'Active'

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Offboarding</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your exit process, complaints and warnings</p>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 font-medium">Employment Status</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusLabel === 'Active' ? 'bg-green-50 text-green-600' : STATUS_COLORS[statusLabel] || 'bg-gray-100 text-gray-500'}`}>
              {statusLabel === 'Active' ? '● Active Employee' : `● ${statusLabel}`}
            </span>
          </div>
          {activeOffboarding?.manager_notes && (
            <p className="text-xs text-gray-500 mt-2">Manager note: {activeOffboarding.manager_notes}</p>
          )}
        </div>
        {!activeOffboarding && (
          <button onClick={() => setShowResignModal(true)}
            className="bg-red-50 hover:bg-red-100 text-red-500 text-sm font-semibold px-5 py-2.5 rounded-lg transition">
            Submit Resignation
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['status', 'Resignation History'], ['complaints', 'My Complaints'], ['warnings', 'Warnings']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
            {key === 'warnings' && warnings.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5">{warnings.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Resignation History */}
      {activeTab === 'status' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {offboarding.length === 0 ? (
            <div className="p-10 text-center"><p className="text-gray-400 text-sm">No offboarding requests submitted.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium">Type</th>
                  <th className="text-left px-6 py-3 font-medium">Reason</th>
                  <th className="text-left px-6 py-3 font-medium">Last Working Day</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Manager Notes</th>
                </tr></thead>
                <tbody>
                  {offboarding.map(o => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">{o.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{o.reason || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{o.last_working_day ? new Date(o.last_working_day).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="px-6 py-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>{o.status}</span></td>
                      <td className="px-6 py-4 text-sm text-gray-500">{o.manager_notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Complaints */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowComplaintModal(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
              + Raise Complaint
            </button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            {complaints.length === 0 ? (
              <div className="p-10 text-center"><p className="text-gray-400 text-sm">No complaints raised yet.</p></div>
            ) : (
              <div className="divide-y divide-gray-50">
                {complaints.map(c => (
                  <div key={c.id} className="px-6 py-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{c.title}</p>
                        <p className="text-sm text-gray-500 mt-1">{c.description}</p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ml-4 ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                    </div>
                    {c.manager_response && (
                      <div className="mt-3 bg-blue-50 rounded-lg px-4 py-3">
                        <p className="text-xs text-blue-500 font-medium mb-1">Manager Response</p>
                        <p className="text-sm text-gray-700">{c.manager_response}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{new Date(c.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {activeTab === 'warnings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {warnings.length === 0 ? (
            <div className="p-10 text-center"><p className="text-gray-400 text-sm">No warnings on record.</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {warnings.map(w => (
                <div key={w.id} className="px-6 py-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold bg-red-50 text-red-500 px-2.5 py-1 rounded-full">Warning Letter</span>
                      <p className="text-sm text-gray-500 mt-2">Issued on {new Date(w.generated_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <p className="text-xs text-gray-400">Issued by HR</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resignation Modal */}
      {showResignModal && (
        <Modal title="Submit Resignation" onClose={() => setShowResignModal(false)}>
          <div className="space-y-4">
            <div className="bg-red-50 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600 font-medium">⚠ This will be sent to your manager for review.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Resignation</label>
              <textarea value={resignForm.reason} onChange={e => setResignForm({...resignForm, reason: e.target.value})}
                rows={4} placeholder="Please provide your reason..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Last Working Day</label>
              <input type="date" value={resignForm.last_working_day} onChange={e => setResignForm({...resignForm, last_working_day: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            {resignError && <p className="text-red-500 text-sm">{resignError}</p>}
            <div className="flex gap-3">
              <button onClick={handleResign} disabled={resignSaving}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                {resignSaving ? 'Submitting...' : 'Submit Resignation'}
              </button>
              <button onClick={() => setShowResignModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Complaint Modal */}
      {showComplaintModal && (
        <Modal title="Raise a Complaint" onClose={() => setShowComplaintModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input value={complaintForm.title} onChange={e => setComplaintForm({...complaintForm, title: e.target.value})}
                placeholder="Brief subject of your complaint"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={complaintForm.description} onChange={e => setComplaintForm({...complaintForm, description: e.target.value})}
                rows={5} placeholder="Describe your complaint in detail..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            {complaintError && <p className="text-red-500 text-sm">{complaintError}</p>}
            <div className="flex gap-3">
              <button onClick={handleComplaint} disabled={complaintSaving}
                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                {complaintSaving ? 'Submitting...' : 'Submit Complaint'}
              </button>
              <button onClick={() => setShowComplaintModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default EmployeeOffboarding