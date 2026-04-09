import { useState, useEffect } from 'react'
import { getEmployees, updateEmployee } from '../../services/managerService'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Offboarding() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('active')
  const [showOffboardModal, setShowOffboardModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [offboarded, setOffboarded] = useState(false)
  const [formData, setFormData] = useState({
    type: 'Resignation',
    reason: '',
    last_working_day: '',
    additional_notes: '',
  })

  useEffect(() => { fetchEmployees() }, [])

  const fetchEmployees = async () => {
    try {
      const res = await getEmployees()
      setEmployees(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const activeEmployees = employees.filter(e => e.is_active)
  const inactiveEmployees = employees.filter(e => !e.is_active)

  const handleFormChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const openOffboard = (emp) => {
    setSelectedEmployee(emp)
    setFormData({ type: 'Resignation', reason: '', last_working_day: '', additional_notes: '' })
    setOffboarded(false)
    setShowOffboardModal(true)
  }

  const handlePreview = () => {
    setShowOffboardModal(false)
    setShowPreviewModal(true)
  }

  const handleConfirmOffboard = async () => {
    try {
      // Only deactivate if it's not a warning letter
      if (formData.type !== 'Warning Letter') {
        await updateEmployee(selectedEmployee.id, { ...selectedEmployee, is_active: false })
        fetchEmployees()
      }
      setOffboarded(true)
    } catch (err) {
      console.error(err)
    }
  }

  const handleReactivate = async (emp) => {
    try {
      await updateEmployee(emp.id, { ...emp, is_active: true })
      fetchEmployees()
    } catch (err) {
      console.error(err)
    }
  }

  const getLetterContent = () => {
    const name = selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''
    const designation = selectedEmployee?.designation || ''
    const department = selectedEmployee?.department || ''
    const email = selectedEmployee?.email || ''
    if (formData.type === 'Resignation') {
      return {
        title: 'Acceptance of Resignation',
        body: `Dear ${name},\n\nThis is to acknowledge the receipt of your resignation letter. We hereby accept your resignation from the position of ${designation} in the ${department} department, effective ${formData.last_working_day || '[Last Working Day]'}.\n\nWe appreciate your contributions to the organization and wish you all the best in your future endeavors.\n\n${formData.additional_notes ? `Additional Notes: ${formData.additional_notes}\n\n` : ''}Regards,\nHR Management\nSHNOOR INTERNATIONAL LLC`
      }
    } else if (formData.type === 'Termination') {
      return {
        title: 'Termination Letter',
        body: `Dear ${name},\n\nThis letter is to inform you that your employment with SHNOOR INTERNATIONAL LLC as ${designation} is terminated effective ${formData.last_working_day || '[Date]'}.\n\nReason: ${formData.reason || '[Reason]'}\n\n${formData.additional_notes ? `Additional Notes: ${formData.additional_notes}\n\n` : ''}Please ensure all company property is returned before your last working day.\n\nRegards,\nHR Management\nSHNOOR INTERNATIONAL LLC`
      }
    } else {
      return {
        title: 'Warning Letter',
        body: `Dear ${name},\n\nThis letter serves as a formal warning regarding your conduct/performance at SHNOOR INTERNATIONAL LLC.\n\nReason: ${formData.reason || '[Reason]'}\n\n${formData.additional_notes ? `Additional Notes: ${formData.additional_notes}\n\n` : ''}Please note that continued issues may result in further disciplinary action.\n\nRegards,\nHR Management\nSHNOOR INTERNATIONAL LLC`
      }
    }
  }

  const letter = getLetterContent()

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Offboarding</h1>
        <p className="text-sm text-gray-400 mt-1">Manage employee offboarding, terminations and warning letters</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Active Employees</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{activeEmployees.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Offboarded</p>
          <p className="text-3xl font-bold text-red-500 mt-2">{inactiveEmployees.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Total Records</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{employees.length}</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['active', 'Active Employees'], ['history', 'Offboarding History']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition
              ${activeTab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'active' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Active Employees</h2>
            <p className="text-xs text-gray-400 mt-1">Select an employee to initiate offboarding</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium">#</th>
                  <th className="text-left px-6 py-3 font-medium">Employee</th>
                  <th className="text-left px-6 py-3 font-medium">Department</th>
                  <th className="text-left px-6 py-3 font-medium">Joining Date</th>
                  <th className="text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeEmployees.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-sm text-gray-400">No active employees</td></tr>
                ) : (
                  activeEmployees.map((emp, index) => (
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => openOffboard(emp)}
                          className="text-xs bg-red-50 text-red-500 hover:bg-red-100 font-medium px-3 py-1.5 rounded-lg transition">
                          Initiate Offboarding
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

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-800">Offboarding History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium">#</th>
                  <th className="text-left px-6 py-3 font-medium">Employee</th>
                  <th className="text-left px-6 py-3 font-medium">Department</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inactiveEmployees.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-10 text-sm text-gray-400">No offboarding history</td></tr>
                ) : (
                  inactiveEmployees.map((emp, index) => (
                    <tr key={emp.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800">{emp.first_name} {emp.last_name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="bg-red-50 text-red-500 text-xs font-medium px-2.5 py-1 rounded-full">Inactive</span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleReactivate(emp)}
                          className="text-xs text-green-600 hover:underline font-medium">Reactivate</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OFFBOARD FORM MODAL */}
      {showOffboardModal && selectedEmployee && (
        <Modal title={`Offboard — ${selectedEmployee.first_name} ${selectedEmployee.last_name}`} onClose={() => setShowOffboardModal(false)}>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-800">{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
              <p className="text-xs text-gray-400">{selectedEmployee.designation} · {selectedEmployee.department}</p>
              <p className="text-xs text-gray-400">{selectedEmployee.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Offboarding Type</label>
              <select name="type" value={formData.type} onChange={handleFormChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option>Resignation</option>
                <option>Termination</option>
                <option>Warning Letter</option>
              </select>
            </div>
            {formData.type !== 'Warning Letter' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day</label>
                <input type="date" name="last_working_day" value={formData.last_working_day} onChange={handleFormChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea name="reason" value={formData.reason} onChange={handleFormChange}
                placeholder="Provide reason..." rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes (optional)</label>
              <textarea name="additional_notes" value={formData.additional_notes} onChange={handleFormChange}
                placeholder="Any additional information..." rows={2}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handlePreview}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">
              Preview Letter
            </button>
            <button onClick={() => setShowOffboardModal(false)}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* LETTER PREVIEW MODAL */}
      {showPreviewModal && selectedEmployee && (
        <Modal title="Letter Preview" onClose={() => { setShowPreviewModal(false); setOffboarded(false) }}>
          {offboarded ? (
            <div className="text-center py-6">
              <p className="text-4xl mb-4">✅</p>
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {formData.type === 'Warning Letter' ? 'Warning Letter Sent' : 'Offboarding Completed'}
              </h3>
              <p className="text-sm text-gray-400 mb-2">
                {formData.type === 'Warning Letter'
                  ? `Warning letter issued to ${selectedEmployee.first_name} ${selectedEmployee.last_name}.`
                  : `${selectedEmployee.first_name} ${selectedEmployee.last_name} has been marked as inactive.`}
              </p>
              <button onClick={() => { setShowPreviewModal(false); setOffboarded(false) }}
                className="mt-6 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <img src="/shnoor-logo.png" alt="SHNOOR" className="h-10 w-auto object-contain" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">SHNOOR INTERNATIONAL LLC</p>
                    <p className="text-xs text-gray-400">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-4">{letter.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{letter.body}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleConfirmOffboard}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                  {formData.type === 'Warning Letter' ? 'Send Warning' : 'Confirm & Offboard'}
                </button>
                <button onClick={() => { setShowPreviewModal(false); setShowOffboardModal(true) }}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
                  Edit Letter
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

    </div>
  )
}

export default Offboarding