import { useState, useEffect } from 'react'
import { getEmployees, updateEmployee } from '../../services/managerService'
import { getOffboardingRequests, updateOffboardingStatus, deactivateEmployee, getComplaints, respondToComplaint, generateLetter } from '../../services/managerService'
import { jsPDF } from 'jspdf'
import api from '../../services/api'
import { usePlan } from '../../context/PlanContext'
import FeatureGateScreen from '../../components/FeatureGateScreen'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-display text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

const STATUS_COLORS = {
  'Pending': 'bg-yellow-50 text-yellow-600',
  'Approved': 'bg-green-50 text-green-600',
  'Rejected': 'bg-red-50 text-red-500',
  'In Progress': 'bg-amber-50 text-amber-700',
  'Completed': 'bg-gray-100 text-gray-500',
  'Open': 'bg-yellow-50 text-yellow-600',
  'Under Review': 'bg-amber-50 text-amber-700',
  'Resolved': 'bg-green-50 text-green-600',
  'Closed': 'bg-gray-100 text-gray-500',
}

async function downloadLetterPDF(letter, empName) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210, margin = 20, contentW = pageW - margin * 2
  let logoBase64 = null
  try {
    const blob = await fetch('/shnoor-logo.png').then(r => r.blob())
    logoBase64 = await new Promise(resolve => {
      const r = new FileReader()
      r.onload = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
  } catch (e) { }
  doc.setFillColor(15, 118, 110)
  doc.rect(0, 0, pageW, 38, 'F')
  if (logoBase64) doc.addImage(logoBase64, 'PNG', margin, 8, 22, 22)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('SHNOOR INTERNATIONAL LLC', logoBase64 ? margin + 27 : margin, 18)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('HR Management System', logoBase64 ? margin + 27 : margin, 25)
  doc.setFillColor(240, 253, 250)
  doc.rect(margin, 48, contentW, 12, 'F')
  doc.setTextColor(15, 118, 110)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(letter.title || letter.letter_type, margin + 5, 57)
  doc.setTextColor(51, 65, 85)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(letter.content, contentW)
  let y = 72
  for (const line of lines) {
    if (y > 270) { doc.addPage(); y = 20 }
    doc.text(line, margin, y)
    y += 6
  }
  doc.save(`${(letter.letter_type || 'Letter').replace(/ /g, '_')}_${empName}.pdf`)
}

function Offboarding() {
  const [employees, setEmployees] = useState([])
  const [offboardingRequests, setOffboardingRequests] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [pageError, setPageError] = useState('')

  const [showWarnModal, setShowWarnModal] = useState(false)
  const [warnTarget, setWarnTarget] = useState(null)
  const [warnReason, setWarnReason] = useState('')
  const [warnSaving, setWarnSaving] = useState(false)

  const [showOffboardModal, setShowOffboardModal] = useState(false)
  const [offboardTarget, setOffboardTarget] = useState(null)
  const [offboardForm, setOffboardForm] = useState({ reason: '', last_working_day: '', manager_notes: '' })
  const [offboardError, setOffboardError] = useState('')

  const [showResignModal, setShowResignModal] = useState(false)
  const [resignTarget, setResignTarget] = useState(null)
  const [resignAction, setResignAction] = useState({ status: 'Approved', manager_notes: '', last_working_day: '' })

  const [showComplaintModal, setShowComplaintModal] = useState(false)
  const [complaintTarget, setComplaintTarget] = useState(null)
  const [complaintResponse, setComplaintResponse] = useState({ manager_response: '', status: 'Under Review' })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [empRes, offRes, compRes] = await Promise.all([
        getEmployees(), getOffboardingRequests(), getComplaints()
      ])
      setEmployees(empRes.data.data || [])
      setOffboardingRequests(offRes.data.data || [])
      setComplaints(compRes.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeEmployees = employees.filter(e => e.is_active)
  const inactiveEmployees = employees.filter(e => !e.is_active)
  const pendingResignations = offboardingRequests.filter(o => o.status === 'Pending' && o.requested_by === 'employee')

  const handleSendWarning = async () => {
    if (!warnReason) return
    setWarnSaving(true)
    try {
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      const name = `${warnTarget.first_name} ${warnTarget.last_name}`
      await generateLetter({
        employee_id: warnTarget.id,
        letter_type: 'Warning Letter',
        title: 'Warning Letter',
        content: `Date: ${today}\n\nDear ${name},\n\nThis letter serves as a formal warning regarding your conduct/performance at SHNOOR INTERNATIONAL LLC.\n\nReason: ${warnReason}\n\nPlease note that continued issues may result in further disciplinary action, which may include termination of employment.\n\nHR Management\nSHNOOR INTERNATIONAL LLC`
      })
      setShowWarnModal(false)
      setWarnReason('')
      alert(`Warning letter sent to ${name}.`)
    } catch (err) {
      alert('Failed to send warning.')
    } finally {
      setWarnSaving(false)
    }
  }

  const handleInitiateOffboard = async () => {
    setOffboardError('')
    try {
      await api.post('/manager/offboarding-requests', {
        employee_id: offboardTarget.id,
        type: 'Termination',
        ...offboardForm,
        requested_by: 'manager',
        status: 'In Progress'
      })
      setShowOffboardModal(false)
      setOffboardForm({ reason: '', last_working_day: '', manager_notes: '' })
      fetchAll()
    } catch (err) {
      // Backend returns 400 if employee already has an active offboarding request
      const msg = err.response?.data?.message || 'Failed to initiate offboarding.'
      setOffboardError(msg)
    }
  }

  const handleResignAction = async () => {
    try {
      await updateOffboardingStatus(resignTarget.id, resignAction)
      if (resignAction.status === 'Approved') {
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        const lwd = resignAction.last_working_day
          ? new Date(resignAction.last_working_day).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
          : '[Last Working Day]'
        await generateLetter({
          employee_id: resignTarget.employee_id,
          letter_type: 'Relieving Letter',
          title: 'Acceptance of Resignation',
          content: `Date: ${today}\n\nDear ${resignTarget.first_name} ${resignTarget.last_name},\n\nThis is to acknowledge receipt of your resignation. We accept your resignation effective ${lwd}.\n\nWe appreciate your contributions to SHNOOR INTERNATIONAL LLC and wish you all the best in your future endeavors.\n\n${resignAction.manager_notes ? `Notes: ${resignAction.manager_notes}\n\n` : ''}HR Management\nSHNOOR INTERNATIONAL LLC`
        })
      }
      setShowResignModal(false)
      fetchAll()
    } catch (err) {
      alert('Failed to update resignation.')
    }
  }

  const handleGenerateTerminationLetter = async (o) => {
    try {
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      const lwd = o.last_working_day
        ? new Date(o.last_working_day).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        : '[Last Working Day]'
      await generateLetter({
        employee_id: o.employee_id,
        letter_type: 'Termination Letter',
        title: 'Termination Letter',
        content: `Date: ${today}\n\nDear ${o.first_name} ${o.last_name},\n\nThis letter is to inform you that your employment with SHNOOR INTERNATIONAL LLC as ${o.designation || 'employee'} is terminated effective ${lwd}.\n\nReason: ${o.reason || '[Reason]'}\n\n${o.manager_notes ? `Notes: ${o.manager_notes}\n\n` : ''}Please ensure all company property is returned before your last working day.\n\nHR Management\nSHNOOR INTERNATIONAL LLC`
      })
      alert(`Termination letter generated for ${o.first_name} ${o.last_name}. They can view it in their Letters section.`)
    } catch (err) {
      alert('Failed to generate letter.')
    }
  }

  const handleComplaintResponse = async () => {
    try {
      await respondToComplaint(complaintTarget.id, complaintResponse)
      setShowComplaintModal(false)
      fetchAll()
    } catch (err) {
      alert('Failed to respond.')
    }
  }

  // Fix: use o.employee_id (the user's actual id) — NOT o.id (the offboarding request's row id)
  const handleDeactivate = async (o) => {
    if (!window.confirm(`Permanently deactivate ${o.first_name} ${o.last_name}? They will lose login access immediately.`)) return
    try {
      await deactivateEmployee(o.employee_id)
      fetchAll()
    } catch (err) {
      alert('Failed to deactivate.')
    }
  }

  const handleReactivate = async (emp) => {
    try {
      await updateEmployee(emp.id, { ...emp, is_active: true })
      fetchAll()
    } catch (err) {
      console.error(err)
    }
  }

  const { features, loading: planLoading } = usePlan()
  if (planLoading) return null
  if (!features?.offboarding?.enabled) return <FeatureGateScreen featureName="Offboarding" requiredPlan="Pro" />
  if (loading) return (
    <div className="flex items-center justify-center h-64"><p className="font-body text-gray-400">Loading...</p></div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Offboarding</h1>
        <p className="font-body text-sm text-gray-400 mt-1">Manage employee exit processes, warnings and complaints</p>
      </div>

      {pageError && (
        <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 flex justify-between">
          {pageError}
          <button onClick={() => setPageError('')} className="font-bold ml-4">×</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ['Active Employees', activeEmployees.length, 'text-green-600'],
          ['Pending Resignations', pendingResignations.length, 'text-yellow-600'],
          ['Offboarded', inactiveEmployees.length, 'text-red-500'],
          ['Open Complaints', complaints.filter(c => c.status === 'Open').length, 'text-primary'],
        ].map(([label, val, color]) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="font-body text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          ['active', 'Active Employees'],
          ['resignations', 'Resignations'],
          ['offboarded', 'Offboarded'],
          ['complaints', 'Complaints'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
              ${activeTab === key ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Active Employees */}
      {activeTab === 'active' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-base font-semibold text-gray-800">Active Employees</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="font-display text-left px-6 py-3 font-medium">Name</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Department</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Designation</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeEmployees.length === 0 ? (
                  <tr><td colSpan="4" className="font-body text-center py-10 text-sm text-gray-400">No active employees</td></tr>
                ) : (
                  activeEmployees.map(emp => (
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-display text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{emp.designation || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button onClick={() => { setWarnTarget(emp); setWarnReason(''); setShowWarnModal(true) }}
                            className="text-xs bg-yellow-50 text-yellow-600 hover:bg-yellow-100 font-medium px-3 py-1.5 rounded-lg transition">
                            Warn
                          </button>
                          <button onClick={() => { setOffboardTarget(emp); setOffboardForm({ reason: '', last_working_day: '', manager_notes: '' }); setOffboardError(''); setShowOffboardModal(true) }}
                            className="text-xs bg-red-50 text-red-500 hover:bg-red-100 font-medium px-3 py-1.5 rounded-lg transition">
                            Offboard
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resignations */}
      {activeTab === 'resignations' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-base font-semibold text-gray-800">Resignation &amp; Termination Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="font-display text-left px-6 py-3 font-medium">Employee</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Type</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Requested By</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Last Working Day</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offboardingRequests.length === 0 ? (
                  <tr><td colSpan="6" className="font-body text-center py-10 text-sm text-gray-400">No offboarding requests</td></tr>
                ) : (
                  offboardingRequests.map(o => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-display text-sm font-medium text-gray-800">{o.first_name} {o.last_name}</p>
                        <p className="text-xs text-gray-400">{o.designation}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{o.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize">{o.requested_by}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {o.last_working_day ? new Date(o.last_working_day).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-500'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {/* Review button — only for pending employee resignations */}
                          {o.requested_by === 'employee' && o.status === 'Pending' && (
                            <button onClick={() => { setResignTarget(o); setResignAction({ status: 'Approved', manager_notes: '', last_working_day: '' }); setShowResignModal(true) }}
                              className="text-xs text-primary hover:underline font-medium">
                              Review
                            </button>
                          )}
                          {/* Generate termination letter */}
                          {o.type === 'Termination' && o.status === 'In Progress' && (
                            <button onClick={() => handleGenerateTerminationLetter(o)}
                              className="text-xs text-orange-500 hover:underline font-medium">
                              Generate Letter
                            </button>
                          )}
                          {/* Deactivate — only when employee is still active and request is actionable */}
                          {(o.status === 'Approved' || o.status === 'In Progress') && o.is_active && (
                            <button onClick={() => handleDeactivate(o)}
                              className="text-xs bg-red-50 text-red-500 hover:bg-red-100 font-medium px-2 py-1 rounded-lg transition">
                              Deactivate
                            </button>
                          )}
                          {/* Already deactivated — show completed badge */}
                          {!o.is_active && (
                            <span className="text-xs text-gray-400 italic">Account deactivated</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offboarded */}
      {activeTab === 'offboarded' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-base font-semibold text-gray-800">Offboarded Employees</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="font-display text-left px-6 py-3 font-medium">Name</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Department</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Designation</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inactiveEmployees.length === 0 ? (
                  <tr><td colSpan="4" className="font-body text-center py-10 text-sm text-gray-400">No offboarded employees</td></tr>
                ) : (
                  inactiveEmployees.map(emp => (
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-500">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{emp.department || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{emp.designation || '—'}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleReactivate(emp)}
                          className="text-xs bg-green-50 text-green-600 hover:bg-green-100 font-medium px-3 py-1.5 rounded-lg transition">
                          Reactivate
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Complaints */}
      {activeTab === 'complaints' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-display text-base font-semibold text-gray-800">Employee Complaints</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="font-display text-left px-6 py-3 font-medium">Employee</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Title</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Status</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Date</th>
                  <th className="font-display text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.length === 0 ? (
                  <tr><td colSpan="5" className="font-body text-center py-10 text-sm text-gray-400">No complaints raised</td></tr>
                ) : (
                  complaints.map(c => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="font-display text-sm font-medium text-gray-800">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-gray-400">{c.department}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.title}</td>
                      <td className="px-6 py-4">
                        <span className={`font-display px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-500'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => { setComplaintTarget(c); setComplaintResponse({ manager_response: c.manager_response || '', status: c.status }); setShowComplaintModal(true) }}
                          className="text-xs text-primary hover:underline font-medium">
                          Respond
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {showWarnModal && warnTarget && (
        <Modal title={`Send Warning — ${warnTarget.first_name} ${warnTarget.last_name}`} onClose={() => setShowWarnModal(false)}>
          <div className="space-y-4">
            <p className="font-body text-sm text-gray-500">A formal warning letter will be generated and visible in the employee's Letters section.</p>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Reason for Warning</label>
              <textarea value={warnReason} onChange={e => setWarnReason(e.target.value)} rows={4}
                placeholder="Describe the specific issue or misconduct..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleSendWarning} disabled={warnSaving || !warnReason}
              className="flex-1 bg-yellow-400 hover:bg-yellow-500 disabled:bg-yellow-200 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              {warnSaving ? 'Sending...' : 'Send Warning'}
            </button>
            <button onClick={() => setShowWarnModal(false)}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Initiate Offboard Modal */}
      {showOffboardModal && offboardTarget && (
        <Modal title={`Initiate Offboarding — ${offboardTarget.first_name} ${offboardTarget.last_name}`} onClose={() => setShowOffboardModal(false)}>
          <div className="space-y-4">
            <p className="font-body text-sm text-gray-500">This will create a termination request. After generating the termination letter, use the Deactivate button to block their account.</p>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Reason for Termination</label>
              <textarea value={offboardForm.reason} onChange={e => setOffboardForm({ ...offboardForm, reason: e.target.value })} rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Last Working Day</label>
              <input type="date" value={offboardForm.last_working_day} onChange={e => setOffboardForm({ ...offboardForm, last_working_day: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Manager Notes</label>
              <textarea value={offboardForm.manager_notes} onChange={e => setOffboardForm({ ...offboardForm, manager_notes: e.target.value })} rows={2}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            {offboardError && (
              <div className="font-body bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{offboardError}</div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleInitiateOffboard}
              className="font-display flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              Confirm Offboarding
            </button>
            <button onClick={() => setShowOffboardModal(false)}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Review Resignation Modal */}
      {showResignModal && resignTarget && (
        <Modal title={`Review Resignation — ${resignTarget.first_name} ${resignTarget.last_name}`} onClose={() => setShowResignModal(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
              <p><span className="font-medium">Reason:</span> {resignTarget.reason || '—'}</p>
              <p className="mt-1"><span className="font-medium">Requested Last Day:</span> {resignTarget.last_working_day ? new Date(resignTarget.last_working_day).toLocaleDateString('en-GB') : '—'}</p>
            </div>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Decision</label>
              <select value={resignAction.status} onChange={e => setResignAction({ ...resignAction, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="Approved">Approve</option>
                <option value="Rejected">Reject</option>
              </select>
            </div>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Confirmed Last Working Day</label>
              <input type="date" value={resignAction.last_working_day} onChange={e => setResignAction({ ...resignAction, last_working_day: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={resignAction.manager_notes} onChange={e => setResignAction({ ...resignAction, manager_notes: e.target.value })} rows={2}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleResignAction}
              className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition"
            >
              Submit Decision
            </button>
            <button onClick={() => setShowResignModal(false)}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Complaint Response Modal */}
      {showComplaintModal && complaintTarget && (
        <Modal title="Respond to Complaint" onClose={() => setShowComplaintModal(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-display text-sm font-semibold text-gray-800">{complaintTarget.title}</p>
              <p className="text-sm text-gray-500 mt-1">{complaintTarget.description}</p>
            </div>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Your Response</label>
              <textarea value={complaintResponse.manager_response} onChange={e => setComplaintResponse({ ...complaintResponse, manager_response: e.target.value })} rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div>
              <label className="font-display block text-sm font-medium text-gray-700 mb-1">Update Status</label>
              <select value={complaintResponse.status} onChange={e => setComplaintResponse({ ...complaintResponse, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="Open">Open</option>
                <option value="Under Review">Under Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleComplaintResponse}
              className="font-display flex-1 bg-primary hover:opacity-90 text-white text-sm font-semibold py-2.5 rounded-lg transition"
            >
              Submit Response
            </button>
            <button onClick={() => setShowComplaintModal(false)}
              className="font-display flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Offboarding