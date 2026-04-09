const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')

const { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController')
const { getLeaves, updateLeaveStatus, getMyLeaves, applyLeave } = require('../controllers/leaveController')
const { getAttendance, clockIn, clockOut, getMyAttendance } = require('../controllers/attendanceController')
const { getExpenses, updateExpenseStatus, getMyExpenses, submitExpense } = require('../controllers/expenseController')
const { getSalaries, upsertSalary, getMySalary } = require('../controllers/salaryController')
const { getHolidays, createHoliday, deleteHoliday, getPolicies, createPolicy, deletePolicy, getProfile, updateProfile, getDashboardStats } = require('../controllers/managerController')

router.use(authenticate)
router.use(authorize('manager'))

// Dashboard
router.get('/dashboard', getDashboardStats)

// Employees
router.get('/employees', getEmployees)
router.get('/employees/:id', getEmployee)
router.post('/employees', createEmployee)
router.put('/employees/:id', updateEmployee)
router.delete('/employees/:id', deleteEmployee)

// Leaves
router.get('/leaves', getLeaves)
router.put('/leaves/:id', updateLeaveStatus)

// Self leaves
router.get('/self/leaves', getMyLeaves)
router.post('/self/leaves', applyLeave)

// Attendance
router.get('/attendance', getAttendance)
router.get('/self/attendance', getMyAttendance)
router.post('/self/clock-in', clockIn)
router.post('/self/clock-out', clockOut)

// Expenses
router.get('/expenses', getExpenses)
router.put('/expenses/:id', updateExpenseStatus)
router.get('/self/expenses', getMyExpenses)
router.post('/self/expenses', submitExpense)

// Salary
router.get('/salary', getSalaries)
router.post('/salary', upsertSalary)
router.get('/self/salary', getMySalary)

// Holidays
router.get('/holidays', getHolidays)
router.post('/holidays', createHoliday)
router.delete('/holidays/:id', deleteHoliday)

// Policies
router.get('/policies', getPolicies)
router.post('/policies', createPolicy)
router.delete('/policies/:id', deletePolicy)

// Profile
router.get('/self/profile', getProfile)
router.put('/self/profile', updateProfile)

router.put('/self/change-password', async (req, res) => {
  const pool = require('../config/db')
  const bcrypt = require('bcryptjs')
  try {
    const { current_password, new_password } = req.body
    const result = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id])
    const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash)
    if (!isValid) return res.status(400).json({ success: false, message: 'Current password is incorrect' })
    const password_hash = await bcrypt.hash(new_password, 10)
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [password_hash, req.user.id])
    res.json({ success: true, message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Manager mark attendance for employee
router.post('/attendance/mark', async (req, res) => {
  const pool = require('../config/db')
  try {
    const { user_id, date, status, clock_in, clock_out } = req.body
    await pool.query(
      `INSERT INTO attendance (user_id, company_id, date, clock_in, clock_out, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, date) DO UPDATE
       SET clock_in=$4, clock_out=$5, status=$6`,
      [user_id, req.user.company_id, date,
       status === 'Present' || status === 'Late' ? clock_in : null,
       status === 'Present' || status === 'Late' ? clock_out : null,
       status]
    )
    res.json({ success: true, message: 'Attendance marked' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Manager edit attendance record
router.put('/attendance/:id', async (req, res) => {
  const pool = require('../config/db')
  try {
    const { clock_in, clock_out, status } = req.body
    const result = await pool.query(
      `UPDATE attendance SET clock_in=$1, clock_out=$2, status=$3 WHERE id=$4 RETURNING *`,
      [clock_in || null, clock_out || null, status, req.params.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router