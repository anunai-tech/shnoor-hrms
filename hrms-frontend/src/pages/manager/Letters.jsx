import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getEmployees, generateLetter, getLetters, getSalaries, getManagerProfile } from '../../services/managerService'
import { jsPDF } from 'jspdf'

const LETTER_TYPES = [
  'Offer Letter',
  'Appointment Letter',
  'Salary Increment Letter',
  'Appreciation Letter',
  'Warning Letter',
  'Bonafide / Employment Certificate',
  'Experience Letter',
  'Relieving Letter',
]

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getTemplate(type, emp, salary, extra = {}) {
  const name = `${emp.first_name} ${emp.last_name}`
  const designation = emp.designation || '[Designation]'
  const department = emp.department || '[Department]'
  const joiningDate = emp.joining_date ? new Date(emp.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '[Joining Date]'
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const netPay = salary ? `Rs. ${Number(salary.net_pay).toLocaleString('en-IN')}` : '[Salary]'
  const lwd = extra.last_working_day ? new Date(extra.last_working_day).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '[Last Working Day]'

  const templates = {
    'Offer Letter': {
      title: 'Offer Letter',
      content: `Date: ${today}\n\nDear ${name},\n\nWe are pleased to offer you the position of ${designation} in the ${department} department at SHNOOR INTERNATIONAL LLC.\n\nYour compensation will be ${netPay} per month (net), subject to applicable deductions as per company policy.\n\nThis offer is contingent upon successful completion of our background verification process. Please confirm your acceptance by signing and returning a copy of this letter.\n\nWe look forward to welcoming you to our team.\n\nWarm Regards,\nHR Management\nSHNOOR INTERNATIONAL LLC`
    },
    'Appointment Letter': {
      title: 'Appointment Letter',
      content: `Date: ${today}\n\nDear ${name},\n\nWith reference to your application and subsequent interview, we are pleased to appoint you as ${designation} in the ${department} department of SHNOOR INTERNATIONAL LLC with effect from ${joiningDate}.\n\nYour monthly compensation will be ${netPay} (net), subject to applicable deductions.\n\nYou will be on probation for a period of six (6) months from your date of joining. During this period, either party may terminate employment with two weeks' notice.\n\nPlease report to the HR department on your date of joining with the required documents.\n\nWe wish you a successful career with us.\n\nWarm Regards,\nHR Management\nSHNOOR INTERNATIONAL LLC`
    },
    'Salary Increment Letter': {
      title: 'Salary Increment Letter',
      content: `Date: ${today}\n\nDear ${name},\n\nWe are pleased to inform you that based on your performance review and contributions to SHNOOR INTERNATIONAL LLC, your compensation has been revised.\n\nPrevious Salary: ${extra.old_salary || '[Previous Salary]'}\nRevised Salary: ${netPay} per month (net)\n\nThis revision is effective from ${extra.effective_date || today}.\n\nWe appreciate your continued dedication and look forward to your ongoing contributions to the organisation.\n\nWarm Regards,\nHR Management\nSHNOOR INTERNATIONAL LLC`
    },
    'Appreciation Letter': {
      title: 'Letter of Appreciation',
      content: `Date: ${today}\n\nDear ${name},\n\nOn behalf of SHNOOR INTERNATIONAL LLC, we would like to express our sincere appreciation for your outstanding contribution and dedication to your role as ${designation} in the ${department} department.\n\nYour hard work, commitment, and professionalism have been an inspiration to your colleagues and have greatly benefited the organisation.\n\nWe encourage you to continue the excellent work and look forward to your continued contributions.\n\nWith warm appreciation,\nHR Management\nSHNOOR INTERNATIONAL LLC`
    },
    'Warning Letter': {
      title: 'Warning Letter',
      content: `Date: ${today}\n\nDear ${name},\n\nThis letter serves as a formal warning regarding your conduct/performance at SHNOOR INTERNATIONAL LLC.\n\nSpecific Issue: ${extra.reason || '[Please describe the specific issue or misconduct]'}\n\nDespite previous verbal counselling, there has been no significant improvement. This is unacceptable and cannot be tolerated.\n\nYou are hereby warned that a recurrence of this behaviour or failure to improve your performance will result in further disciplinary action, which may include termination of employment.\n\nPlease acknowledge receipt of this letter by signing below.\n\nHR Management\nSHNOOR INTERNATIONAL LLC`
    },
    'Bonafide / Employment Certificate': {
      title: 'Employment Certificate',
      content: `Date: ${today}\n\nTO WHOM IT MAY CONCERN\n\nThis is to certify that ${name} is a bonafide employee of SHNOOR INTERNATIONAL LLC, holding the position of ${designation} in the ${department} department.\n\nShe/He has been employed with us since ${joiningDate} and continues to be in our employment as of this date.\n\nThis certificate is issued at the request of the employee for ${extra.purpose || 'personal purposes'} and should not be construed as a recommendation.\n\nHR Management\nSHNOOR INTERNATIONAL LLC`
    },
    'Experience Letter': {
      title: 'Experience Letter',
      content: `Date: ${today}\n\nTO WHOM IT MAY CONCERN\n\nThis is to certify that ${name} was employed with SHNOOR INTERNATIONAL LLC from ${joiningDate} to ${lwd} in the capacity of ${designation} in the ${department} department.\n\nDuring their tenure, they demonstrated professionalism and commitment to their responsibilities. We found them to be a diligent and hardworking individual.\n\nWe wish them all the best in their future endeavors.\n\nHR Management\nSHNOOR INTERNATIONAL LLC`
    },
    'Relieving Letter': {
      title: 'Relieving Letter',
      content: `Date: ${today}\n\nDear ${name},\n\nThis is to confirm that you have been formally relieved from your duties as ${designation} in the ${department} department of SHNOOR INTERNATIONAL LLC, effective ${lwd}.\n\nWe confirm that you have completed all formalities and handover procedures. You are free to pursue other opportunities from the date mentioned above.\n\nWe thank you for your services and wish you the very best in your future career.\n\nHR Management\nSHNOOR INTERNATIONAL LLC`
    },
  }
  return templates[type] || { title: type, content: '' }
}

async function generateLetterPDF(letter, employeeName) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2

  let logoBase64 = null
  try {
    const resp = await fetch('/shnoor-logo.png')
    const blob = await resp.blob()
    logoBase64 = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(blob)
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
  doc.text(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }), pageW - margin, 25, { align: 'right' })

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

  doc.setDrawColor(15, 118, 110)
  doc.line(margin, 282, pageW - margin, 282)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.text('This is an official document generated by SHNOOR HRMS.', pageW / 2, 287, { align: 'center' })

  const filename = `${letter.letter_type}_${employeeName}_${new Date().toLocaleDateString('en-CA')}.pdf`
  doc.save(filename.replace(/ /g, '_'))
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Letters() {
  // ── KEY CHANGE: get logged-in manager's data ──
  const { user } = useAuth()

  const [employees, setEmployees] = useState([])
  const [letters, setLetters] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [empSalary, setEmpSalary] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [letterType, setLetterType] = useState(LETTER_TYPES[0])
  const [editedContent, setEditedContent] = useState('')
  const [extraFields, setExtraFields] = useState({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('generate')

  useEffect(() => {
    Promise.all([getEmployees(), getLetters(), getManagerProfile()])
      .then(([empRes, letRes, profileRes]) => {
        const empList = empRes.data.data || []
        const profile = profileRes.data.data || {}
        // selfCard now has full profile data including designation + department
        const selfCard = { ...user, ...profile, is_active: true, isSelf: true }
        setEmployees([selfCard, ...empList])
        setLetters(letRes.data.data || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])
  const fetchLetters = async () => {
    const res = await getLetters()
    setLetters(res.data.data || [])
  }

  const filteredEmps = employees.filter(e =>
    e.is_active &&
    (`${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (e.department || '').toLowerCase().includes(search.toLowerCase()))
  )

  const openModal = async (emp) => {
    setSelectedEmp(emp)
    setExtraFields({})
    setLetterType(LETTER_TYPES[0])
    try {
      const res = await getSalaries()
      const sal = res.data.data.find(s => s.user_id === emp.id)
      setEmpSalary(sal || null)
    } catch { setEmpSalary(null) }
    const tmpl = getTemplate(LETTER_TYPES[0], emp, null, {})
    setEditedContent(tmpl.content)
    setShowModal(true)
  }

  const handleTypeChange = (type) => {
    setLetterType(type)
    const tmpl = getTemplate(type, selectedEmp, empSalary, extraFields)
    setEditedContent(tmpl.content)
  }

  const handleExtraChange = (key, val) => {
    const updated = { ...extraFields, [key]: val }
    setExtraFields(updated)
    const tmpl = getTemplate(letterType, selectedEmp, empSalary, updated)
    setEditedContent(tmpl.content)
  }

  const handleGenerate = async () => {
    setSaving(true)
    try {
      const tmpl = getTemplate(letterType, selectedEmp, empSalary, extraFields)
      await generateLetter({
        employee_id: selectedEmp.id,
        letter_type: letterType,
        title: tmpl.title,
        content: editedContent,
      })
      setShowModal(false)
      fetchLetters()
      setActiveTab('history')
    } catch (err) {
      alert('Failed to generate letter')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Letters</h1>
        <p className="text-sm text-gray-400 mt-1">Generate and manage employee letters</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[['generate', 'Generate Letter'], ['history', 'Letters History']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'generate' && (
        <div className="space-y-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employees by name or department..."
            className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmps.length === 0 ? (
              <p className="text-sm text-gray-400 col-span-3">No employees found</p>
            ) : (
              filteredEmps.map(emp => (
                <div key={emp.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-teal-700 font-bold text-sm">{emp.first_name?.charAt(0)}</span>
                    </div>
                    <div>
                      {/* ── KEY CHANGE: show "You" badge for manager self card ── */}
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{emp.first_name} {emp.last_name}</p>
                        {emp.isSelf && (
                          <span className="text-xs bg-teal-50 text-teal-600 font-semibold px-2 py-0.5 rounded-full">You</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{emp.designation || '—'} · {emp.department || '—'}</p>
                    </div>
                  </div>
                  <button onClick={() => openModal(emp)}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold py-2 rounded-lg transition">
                    Generate Letter
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          {letters.length === 0 ? (
            <div className="p-10 text-center"><p className="text-gray-400 text-sm">No letters generated yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium">Employee</th>
                    <th className="text-left px-6 py-3 font-medium">Letter Type</th>
                    <th className="text-left px-6 py-3 font-medium">Generated On</th>
                    <th className="text-left px-6 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {letters.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-800">{l.first_name} {l.last_name}</p>
                        <p className="text-xs text-gray-400">{l.designation} · {l.department}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">{l.letter_type}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(l.generated_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => generateLetterPDF(l, `${l.first_name}_${l.last_name}`)}
                          className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg transition">
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && selectedEmp && (
        <Modal title={`Generate Letter — ${selectedEmp.first_name} ${selectedEmp.last_name}${selectedEmp.isSelf ? ' (You)' : ''}`} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Letter Type</label>
              <select value={letterType} onChange={e => handleTypeChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {LETTER_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            {letterType === 'Salary Increment Letter' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previous Salary</label>
                  <input value={extraFields.old_salary || ''} onChange={e => handleExtraChange('old_salary', e.target.value)}
                    placeholder="e.g. Rs. 40,000"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective From</label>
                  <input type="date" value={extraFields.effective_date || ''} onChange={e => handleExtraChange('effective_date', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
            )}
            {(letterType === 'Experience Letter' || letterType === 'Relieving Letter') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Working Day</label>
                <input type="date" value={extraFields.last_working_day || ''} onChange={e => handleExtraChange('last_working_day', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            )}
            {letterType === 'Warning Letter' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Warning</label>
                <input value={extraFields.reason || ''} onChange={e => handleExtraChange('reason', e.target.value)}
                  placeholder="Describe the issue..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            )}
            {letterType === 'Bonafide / Employment Certificate' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input value={extraFields.purpose || ''} onChange={e => handleExtraChange('purpose', e.target.value)}
                  placeholder="e.g. bank loan, visa application..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Letter Content (editable)</label>
              <textarea value={editedContent} onChange={e => setEditedContent(e.target.value)}
                rows={12}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
            </div>

            <div className="flex gap-3">
              <button onClick={handleGenerate} disabled={saving}
                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                {saving ? 'Generating...' : 'Generate & Save'}
              </button>
              <button onClick={() => setShowModal(false)}
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

export default Letters