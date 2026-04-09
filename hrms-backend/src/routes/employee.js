const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')

const { getMyLeaves, applyLeave } = require('../controllers/leaveController')
const { clockIn, clockOut, getMyAttendance } = require('../controllers/attendanceController')
const { getMyExpenses, submitExpense } = require('../controllers/expenseController')
const { getMySalary } = require('../controllers/salaryController')
const { getHolidays, getPolicies } = require('../controllers/managerController')

router.use(authenticate)
router.use(authorize('employee'))

// Leaves
router.get('/leaves', getMyLeaves)
router.post('/leaves', applyLeave)

// Attendance
router.get('/attendance', getMyAttendance)
router.post('/clock-in', clockIn)
router.post('/clock-out', clockOut)

// Expenses
router.get('/expenses', getMyExpenses)
router.post('/expenses', submitExpense)

// Salary
router.get('/salary', getMySalary)

// Holidays + Policies (read only)
router.get('/holidays', getHolidays)
router.get('/policies', getPolicies)

// Profile
router.get('/profile', async (req, res) => {
  const pool = require('../config/db')
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, phone, address, department, designation FROM users WHERE id=$1',
      [req.user.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

router.put('/profile', async (req, res) => {
  const pool = require('../config/db')
  try {
    const { first_name, last_name, phone, address } = req.body
    const result = await pool.query(
      'UPDATE users SET first_name=$1, last_name=$2, phone=$3, address=$4 WHERE id=$5 RETURNING id, first_name, last_name, email, phone, address',
      [first_name, last_name, phone, address, req.user.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

router.put('/change-password', async (req, res) => {
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
module.exports = router