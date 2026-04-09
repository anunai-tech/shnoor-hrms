import { useState, useEffect } from 'react'
import { getMySalary, getMyPayslips } from '../../services/managerService'
import { useAuth } from '../../context/AuthContext'
import jsPDF from 'jspdf'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

// Same PDF generator as EmployeeSalary — reused here for manager self
function generatePayslipPDF(payslip, user) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2

  doc.setFillColor(37, 99, 235)
  doc.rect(0, 0, pageW, 35, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('SHNOOR INTERNATIONAL LLC', margin, 15)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Salary Slip', margin, 23)
  doc.text(`Period: ${MONTHS[payslip.month - 1]} ${payslip.year}`, margin, 29)

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.rect(margin, 45, contentW, 30, 'FD')

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('EMPLOYEE NAME', margin + 5, 54)
  doc.text('DESIGNATION', margin + 70, 54)
  doc.text('DEPARTMENT', margin + 130, 54)

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`${user.first_name} ${user.last_name}`, margin + 5, 62)
  doc.text(user.designation || '—', margin + 70, 62)
  doc.text(user.department || '—', margin + 130, 62)

  let y = 90
  doc.setTextColor(37, 99, 235)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('EARNINGS', margin, y)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y + 3, margin + contentW, y + 3)
  y += 10

  const earningRows = [
    ['Basic Salary', payslip.basic],
    ['House Rent Allowance (HRA)', payslip.hra],
    ['Transport Allowance', payslip.transport],
    ['Other Allowance', payslip.other_allowance],
  ]

  doc.setFont('helvetica', 'normal')
  for (const [label, val] of earningRows) {
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(9.5)
    doc.text(label, margin + 5, y)
    doc.text(`Rs. ${Number(val || 0).toLocaleString('en-IN')}`, margin + contentW - 5, y, { align: 'right' })
    y += 8
  }

  y += 2
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, margin + contentW, y)
  y += 6
  const gross = Number(payslip.basic) + Number(payslip.hra) + Number(payslip.transport) + Number(payslip.other_allowance)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9.5)
  doc.text('Gross Salary', margin + 5, y)
  doc.text(`Rs. ${Number(gross).toLocaleString('en-IN')}`, margin + contentW - 5, y, { align: 'right' })

  y += 14
  doc.setTextColor(220, 38, 38)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('DEDUCTIONS', margin, y)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y + 3, margin + contentW, y + 3)
  y += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(220, 38, 38)
  doc.text('Total Deductions', margin + 5, y)
  doc.text(`- Rs. ${Number(payslip.deductions || 0).toLocaleString('en-IN')}`, margin + contentW - 5, y, { align: 'right' })

  y += 14
  doc.setFillColor(37, 99, 235)
  doc.rect(margin, y, contentW, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('NET PAY', margin + 5, y + 10)
  doc.text(`Rs. ${Number(payslip.net_pay || 0).toLocaleString('en-IN')}`, margin + contentW - 5, y + 10, { align: 'right' })

  y += 35
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('This is a computer-generated payslip and does not require a signature.', pageW / 2, y, { align: 'center' })
  doc.text('© SHNOOR International LLC', pageW / 2, y + 6, { align: 'center' })

  const filename = `Payslip_${user.first_name}_${user.last_name}_${MONTHS[payslip.month - 1]}_${payslip.year}.pdf`
  doc.save(filename)
}

function SelfSalary() {
  const { user } = useAuth()
  const [salary, setSalary] = useState(null)
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMySalary(), getMyPayslips()])
      .then(([salRes, payRes]) => {
        setSalary(salRes.data.data)
        setPayslips(payRes.data.data || [])
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  const gross = salary
    ? Number(salary.basic) + Number(salary.hra) + Number(salary.transport) + Number(salary.other_allowance)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Salary</h1>
        <p className="text-sm text-gray-400 mt-1">Your current salary breakdown and payslip history</p>
      </div>

      {/* Current Salary Breakdown */}
      {!salary ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-gray-400 text-sm">No salary configured yet. Go to Manager → Salary Management to set your salary.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-6 pb-3 border-b border-gray-100">Current Salary Structure</h2>
          <div className="space-y-3 max-w-md">
            {[['Basic Salary', salary.basic],['HRA', salary.hra],['Transport Allowance', salary.transport],['Other Allowance', salary.other_allowance]].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-sm font-medium text-gray-800">₹{Number(val || 0).toLocaleString('en-IN')}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-700">Gross Salary</span>
              <span className="text-sm font-semibold text-gray-800">₹{Number(gross).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-red-500">Deductions</span>
              <span className="text-sm font-medium text-red-500">- ₹{Number(salary.deductions || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-blue-50 rounded-lg px-4 mt-2">
              <span className="text-base font-bold text-blue-700">Net Pay</span>
              <span className="text-2xl font-bold text-blue-700">₹{Number(salary.net_pay || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Payslip History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Payslip History</h2>
          <p className="text-xs text-gray-400 mt-1">Download your monthly payslips as PDF</p>
        </div>
        {payslips.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-400 text-sm">No payslips generated yet. Run payroll from Manager → Salary Management.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 font-medium">Period</th>
                  <th className="text-left px-6 py-3 font-medium">Basic</th>
                  <th className="text-left px-6 py-3 font-medium">Deductions</th>
                  <th className="text-left px-6 py-3 font-medium">Net Pay</th>
                  <th className="text-left px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      {MONTHS[p.month - 1]} {p.year}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{Number(p.basic || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm text-red-500">- ₹{Number(p.deductions || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-blue-600">₹{Number(p.net_pay || 0).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => generatePayslipPDF(p, user)}
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg transition"
                      >
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

    </div>
  )
}

export default SelfSalary