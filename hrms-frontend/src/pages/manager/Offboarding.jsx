import { useState, useEffect } from 'react'
import { getEmployees, updateEmployee } from '../../services/managerService'
import { getOffboardingRequests, updateOffboardingStatus, deactivateEmployee, getComplaints, respondToComplaint, generateLetter } from '../../services/managerService'
import { jsPDF } from 'jspdf'

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
  'Pending': 'bg-yellow-50 text-yellow-600',
  'Approved': 'bg-green-50 text-green-600',
  'Rejected': 'bg-red-50 text-red-500',
  'In Progress': 'bg-blue-50 text-blue-600',
  'Completed': 'bg-gray-100 text-gray-500',
  'Open': 'bg-yellow-50 text-yellow-600',
  'Under Review': 'bg-blue-50 text-blue-600',
  'Resolved': 'bg-green-50 text-green-600',
  'Closed': 'bg-gray-100 text-gray-500',
}

async function downloadLetterPDF(letter, empName) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210, margin = 20, contentW = pageW - margin * 2
  let logoBase64 = null
  try {
    const blob = await fetch('/shnoor-logo.png').then(r => r.blob())
    logoBase64 = await new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob) })
  } catch (e) { }
  doc.setFillColor(15, 118, 110); doc.rect(0, 0, pageW, 38, 'F')
  if (logoBase64) doc.addImage(logoBase64, 'PNG', margin, 8, 22, 22)
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold')
  doc.text('SHNOOR INTERNATIONAL LLC', logoBase64 ? margin + 27 : margin, 18)
  doc.setFontSize(9); doc.setFont('helvetica', 'normal')
  doc.text('HR Management System', logoBase64 ? margin + 27 : margin, 25)
  doc.setFillColor(240, 253, 250); doc.rect(margin, 48, contentW, 12, 'F')
  doc.setTextColor(15, 118, 110); doc.setFontSize(12); doc.setFont('helvetica', 'bold')
  doc.text(letter.title || letter.letter_type, margin + 5, 57)
  doc.setTextColor(51, 65, 85); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(letter.content, contentW)
  let y = 72
  for (const line of lines) { if (y > 270) { doc.addPage(); y = 20 } doc.text(line, margin, y); y += 6 }
  doc.save(`${(letter.letter_type || 'Letter').replace(/ /g, '_')}_${empName}.pdf`)
}

function Offboarding() {
  const [employees, setEmployees] = useState([])
  const [offboardingRequests, setOffboardingRequests] = useState([])
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')

  const [showWarnModal, setShowWarnModal] = useState(false)
  const [warnTarget, setWarnTarget] = useState(null)
  const [warnReason, setWarnReason] = useState('')
  const [warnSaving, setWarnSaving] = useState(false)

  const [showOffboardModal, setShowOffboardModal] = useState(false)
  const [offboardTarget, setOffboardTarget] = useState(null)
  const [offboardForm, setOffboardForm] = useState({ reason: '', last_working_day: '', manager_notes: '' })

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
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
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
    } catch (err) { alert('Failed to send warning.') }
    finally { setWarnSaving(false) }
  }

  const handleInitiateOffboard = async () => {
    try {
      await fetch('http://localhost:5000/api/v1/manager/offboarding-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ employee_id: offboardTarget.id, type: 'Termination', ...offboardForm, requested_by: 'manager', status: 'In Progress' })
      }).then(r => r.json())
      setShowOffboardModal(false)
      fetchAll()
    } catch (err) { console.error(err) }
  }

  const handleResignAction = async () => {
    try {
      await updateOffboardingStatus(resignTarget.id, resignAction)
      if (resignAction.status === 'Approved') {
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
        const lwd = resignAction.last_working_day ? new Date(resignAction.last_working_day).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '[Last Working Day]'
        await generateLetter({
          employee_id: resignTarget.employee_id,
          letter_type: 'Relieving Letter',
          title: 'Acceptance of Resignation',
          content: `Date: ${today}\n\nDear ${resignTarget.first_name} ${resignTarget.last_name},\n\nThis is to acknowledge receipt of your resignation. We accept your resignation effective ${lwd}.\n\nWe appreciate your contributions to SHNOOR INTERNATIONAL LLC and wish you all the best in your future endeavors.\n\n${resignAction.manager_notes ? `Notes: ${resignAction.manager_notes}\n\n` : ''}HR Management\nSHNOOR INTERNATIONAL LLC`
        })
      }
      setShowResignModal(false)
      fetchAll()
    } catch (err) { alert('Failed to update resignation.') }
  }

  // ── CHANGE 1: new handler for manager-initiated termination letter ──
  const handleGenerateTerminationLetter = async (o) => {
    try {
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      const lwd = o.last_working_day ? new Date(o.last_working_day).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '[Last Working Day]'
      await generateLetter({
        employee_id: o.employee_id,
        letter_type: 'Termination Letter',
        title: 'Termination Letter',
        content: `Date: ${today}\n\nDear ${o.first_name} ${o.last_name},\n\nThis letter is to inform you that your employment with SHNOOR INTERNATIONAL LLC as ${o.designation || 'employee'} is terminated effective ${lwd}.\n\nReason: ${o.reason || '[Reason]'}\n\n${o.manager_notes ? `Notes: ${o.manager_notes}\n\n` : ''}Please ensure all company property is returned before your last working day.\n\nHR Management\nSHNOOR INTERNATIONAL LLC`
      })
      alert(`Termination letter generated for ${o.first_name} ${o.last_name}. They can now view it in their Letters section.`)
    } catch (err) {
      alert('Failed to generate letter.')
    }
  }

  const handleComplaintResponse = async () => {
    try {
      await respondToComplaint(complaintTarget.id, complaintResponse)
      setShowComplaintModal(false)
      fetchAll()
    } catch (err) { alert('Failed to respond.') }
  }

  const handleDeactivate = async (emp) => {
    if (!window.confirm(`Permanently deactivate ${emp.first_name} ${emp.last_name}? They will lose login access.`)) return
    try {
      await deactivateEmployee(emp.id)
      fetchAll()
    } catch (err) { alert('Failed to deactivate.') }
  }

  const handleReactivate = async (emp) => {
    try {
      await updateEmployee(emp.id, { ...emp, is_active: true })
      fetchAll()
    } catch (err) { console.error(err) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Offboarding</h1>
        <p className="text-sm text-gray-400 mt-1">Manage employee exit processes, warnings and complaints</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          ['Active Employees', activeEmployees.length, 'text-green-600'],
          ['Pending Resignations', pendingResignations.length, 'text-yellow-600'],
          ['Offboarded', inactiveEmployees.length, 'text-red-500'],
          ['Open Complaints', complaints.filter(c => c.status === 'Open').length, 'text-blue-600'],
        ].map(([label, val, color]) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold mt-2 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {[
          ['active', 'Active Employees'],
          ['resignations', `Resignations${pendingResignations.length > 0 ? ` (${pendingResignations.length})` : ''}`],
          ['complaints', 'Complaints'],
          ['history', 'History'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'active' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Active Employees</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Employee</th>
                <th className="text-left px-6 py-3 font-medium">Department</th>
                <th className="text-left px-6 py-3 font-medium">Joining Date</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {activeEmployees.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-sm text-gray-400">No active employees</td></tr>
                ) : activeEmployees.map((emp, i) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-gray-400">{emp.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => { setWarnTarget(emp); setWarnReason(''); setShowWarnModal(true) }}
                          className="text-xs bg-yellow-50 text-yellow-600 hover:bg-yellow-100 font-medium px-3 py-1.5 rounded-lg transition">
                          Send Warning
                        </button>
                        <button onClick={() => { setOffboardTarget(emp); setOffboardForm({ reason: '', last_working_day: '', manager_notes: '' }); setShowOffboardModal(true) }}
                          className="text-xs bg-red-50 text-red-500 hover:bg-red-100 font-medium px-3 py-1.5 rounded-lg transition">
                          Initiate Offboarding
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'resignations' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Resignation Requests</h2>
            <p className="text-xs text-gray-400 mt-1">Submitted by employees. Accepting auto-generates a Relieving Letter.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">Employee</th>
                <th className="text-left px-6 py-3 font-medium">Reason</th>
                <th className="text-left px-6 py-3 font-medium">Proposed LWD</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {offboardingRequests.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-sm text-gray-400">No resignation requests</td></tr>
                ) : offboardingRequests.map(o => (
                  <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">{o.first_name} {o.last_name}</p>
                      <p className="text-xs text-gray-400">{o.designation}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{o.reason || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{o.last_working_day ? new Date(o.last_working_day).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-6 py-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>{o.status}</span></td>

                    {/* ── CHANGE 2: updated actions column with all 3 button conditions ── */}
                    <td className="px-6 py-4">
                      <div className="flex gap-2 flex-wrap">
                        {/* Employee-submitted resignation pending review */}
                        {o.status === 'Pending' && o.requested_by === 'employee' && (
                          <button onClick={() => { setResignTarget(o); setResignAction({ status: 'Approved', manager_notes: '', last_working_day: o.last_working_day || '' }); setShowResignModal(true) }}
                            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium px-3 py-1.5 rounded-lg transition">
                            Review
                          </button>
                        )}
                        {/* Manager-initiated termination — generate letter */}
                        {o.requested_by === 'manager' && o.status === 'In Progress' && (
                          <button onClick={() => handleGenerateTerminationLetter(o)}
                            className="text-xs bg-teal-50 text-teal-600 hover:bg-teal-100 font-medium px-3 py-1.5 rounded-lg transition">
                            Generate Letter
                          </button>
                        )}
                        {/* Final step — deactivate account */}
                        {(o.status === 'Approved' || o.status === 'In Progress') && (
                          <button onClick={() => handleDeactivate({ id: o.employee_id, first_name: o.first_name, last_name: o.last_name })}
                            className="text-xs bg-red-50 text-red-500 hover:bg-red-100 font-medium px-3 py-1.5 rounded-lg transition">
                            Deactivate Account
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Employee Complaints</h2>
          </div>
          {complaints.length === 0 ? (
            <div className="p-10 text-center"><p className="text-gray-400 text-sm">No complaints raised</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {complaints.map(c => (
                <div key={c.id} className="px-6 py-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-sm font-semibold text-gray-800">{c.title}</p>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-1">From: {c.first_name} {c.last_name} · {c.designation}</p>
                      <p className="text-sm text-gray-600">{c.description}</p>
                      {c.manager_response && (
                        <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2">
                          <p className="text-xs text-blue-500 font-medium">Your Response: {c.manager_response}</p>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setComplaintTarget(c); setComplaintResponse({ manager_response: c.manager_response || '', status: c.status }); setShowComplaintModal(true) }}
                      className="ml-4 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium px-3 py-1.5 rounded-lg transition flex-shrink-0">
                      Respond
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Offboarding History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Employee</th>
                <th className="text-left px-6 py-3 font-medium">Department</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {inactiveEmployees.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-sm text-gray-400">No offboarding history</td></tr>
                ) : inactiveEmployees.map((emp, i) => (
                  <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-gray-400">{emp.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                    <td className="px-6 py-4"><span className="bg-red-50 text-red-500 text-xs font-medium px-2.5 py-1 rounded-full">Inactive</span></td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleReactivate(emp)} className="text-xs text-green-600 hover:underline font-medium">Reactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showWarnModal && warnTarget && (
        <Modal title={`Send Warning — ${warnTarget.first_name} ${warnTarget.last_name}`} onClose={() => setShowWarnModal(false)}>
          <div className="space-y-4">
            <div className="bg-yellow-50 rounded-lg px-4 py-3">
              <p className="text-sm text-yellow-700">A Warning Letter will be generated and sent to the employee's Letters section.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Warning</label>
              <textarea value={warnReason} onChange={e => setWarnReason(e.target.value)}
                rows={4} placeholder="Describe the issue or misconduct..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSendWarning} disabled={warnSaving}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                {warnSaving ? 'Sending...' : 'Send Warning'}
              </button>
              <button onClick={() => setShowWarnModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {showOffboardModal && offboardTarget && (
        <Modal title={`Initiate Offboarding — ${offboardTarget.first_name} ${offboardTarget.last_name}`} onClose={() => setShowOffboardModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea value={offboardForm.reason} onChange={e => setOffboardForm({ ...offboardForm, reason: e.target.value })}
                rows={3} placeholder="Reason for offboarding..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day</label>
              <input type="date" value={offboardForm.last_working_day} onChange={e => setOffboardForm({ ...offboardForm, last_working_day: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager Notes (visible to employee)</label>
              <textarea value={offboardForm.manager_notes} onChange={e => setOffboardForm({ ...offboardForm, manager_notes: e.target.value })}
                rows={2} placeholder="Any notes for employee..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleInitiateOffboard}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                Initiate Offboarding
              </button>
              <button onClick={() => setShowOffboardModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {showResignModal && resignTarget && (
        <Modal title={`Review Resignation — ${resignTarget.first_name} ${resignTarget.last_name}`} onClose={() => setShowResignModal(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700">Reason: <span className="font-normal text-gray-600">{resignTarget.reason}</span></p>
              <p className="text-sm font-medium text-gray-700 mt-1">Proposed LWD: <span className="font-normal text-gray-600">{resignTarget.last_working_day ? new Date(resignTarget.last_working_day).toLocaleDateString('en-GB') : 'Not specified'}</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
              <select value={resignAction.status} onChange={e => setResignAction({ ...resignAction, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="Approved">Approve Resignation</option>
                <option value="Rejected">Reject Resignation</option>
              </select>
            </div>
            {resignAction.status === 'Approved' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmed Last Working Day</label>
                <input type="date" value={resignAction.last_working_day} onChange={e => setResignAction({ ...resignAction, last_working_day: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (visible to employee)</label>
              <textarea value={resignAction.manager_notes} onChange={e => setResignAction({ ...resignAction, manager_notes: e.target.value })}
                rows={2} placeholder="Optional notes..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            <p className="text-xs text-gray-400">
              {resignAction.status === 'Approved' ? '✓ Approving will automatically generate a Relieving Letter for the employee.' : ''}
            </p>
            <div className="flex gap-3">
              <button onClick={handleResignAction}
                className={`flex-1 text-white text-sm font-semibold py-2.5 rounded-lg transition ${resignAction.status === 'Approved' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}>
                {resignAction.status === 'Approved' ? 'Approve & Generate Letter' : 'Reject Resignation'}
              </button>
              <button onClick={() => setShowResignModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {showComplaintModal && complaintTarget && (
        <Modal title="Respond to Complaint" onClose={() => setShowComplaintModal(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-800">{complaintTarget.title}</p>
              <p className="text-sm text-gray-600 mt-1">{complaintTarget.description}</p>
              <p className="text-xs text-gray-400 mt-2">From: {complaintTarget.first_name} {complaintTarget.last_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Response</label>
              <textarea value={complaintResponse.manager_response} onChange={e => setComplaintResponse({ ...complaintResponse, manager_response: e.target.value })}
                rows={4} placeholder="Write your response..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Update Status</label>
              <select value={complaintResponse.status} onChange={e => setComplaintResponse({ ...complaintResponse, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option>Under Review</option>
                <option>Resolved</option>
                <option>Closed</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleComplaintResponse}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Submit Response</button>
              <button onClick={() => setShowComplaintModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Offboarding