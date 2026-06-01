const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const { getMyOffboarding, submitResignation, getMyComplaints, raiseComplaint } = require('../controllers/offboardingController')
const { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee } = require('../controllers/employeeController')
const { getLeaves, updateLeaveStatus, getMyLeaves, applyLeave } = require('../controllers/leaveController')
const {
  getAttendance, getAttendanceSummaryByMonth,
  clockIn, clockOut, lunchStart, lunchEnd,
  getMyAttendance, getCompanySettingsHandler, saveCompanySettings
} = require('../controllers/attendanceController')
const { getExpenses, updateExpenseStatus, getMyExpenses, submitExpense } = require('../controllers/expenseController')
const { getSalaries, upsertSalary, getMySalary, runPayroll, getPayslipsByUser, getMyPayslips } = require('../controllers/salaryController')
const { getHolidays, createHoliday, deleteHoliday, getPolicies, createPolicy, deletePolicy, getProfile, updateProfile, getDashboardStats } = require('../controllers/managerController')
const { generateLetter, getLetters, getMyLetters } = require('../controllers/lettersController')
const { getOffboardingRequests, updateOffboardingStatus, deactivateEmployee, getComplaints, respondToComplaint } = require('../controllers/offboardingController')

const pool = require('../config/db')
const bcrypt = require('bcryptjs')
const { getMyPlanFeatures } = require('../controllers/planFeaturesController')

router.use(authenticate)
router.use(authorize('manager'))

// Dashboard
router.get('/dashboard', getDashboardStats)
router.get('/plan-features', getMyPlanFeatures)

// Employees
router.get('/employees', getEmployees)
router.get('/employees/:id', getEmployee)
router.post('/employees', createEmployee)
router.put('/employees/:id', updateEmployee)
router.delete('/employees/:id', deleteEmployee)

// Leaves
router.get('/leaves', getLeaves)
router.put('/leaves/:id', updateLeaveStatus)

// Manager self leaves
router.get('/self/leaves', getMyLeaves)
router.post('/self/leaves', applyLeave)

// Attendance
router.get('/attendance', getAttendance)
router.get('/attendance/summary', getAttendanceSummaryByMonth)
router.get('/self/attendance', getMyAttendance)
router.post('/self/clock-in', clockIn)
router.post('/self/clock-out', clockOut)
router.post('/self/lunch-start', lunchStart)
router.post('/self/lunch-end', lunchEnd)

// Company settings — office timings, work days, late threshold
router.get('/company-settings', getCompanySettingsHandler)
router.put('/company-settings', saveCompanySettings)

// Expenses
router.get('/expenses', getExpenses)
router.put('/expenses/:id', updateExpenseStatus)
router.get('/self/expenses', getMyExpenses)
router.post('/self/expenses', submitExpense)

// Salary
router.get('/salary', getSalaries)
router.post('/salary', upsertSalary)
router.get('/self/salary', getMySalary)

// Payroll & Payslips
router.post('/payroll/run', runPayroll)
router.get('/payslips/:user_id', getPayslipsByUser)
router.get('/self/payslips', getMyPayslips)

// Letters
router.get('/letters', getLetters)
router.post('/letters', generateLetter)
router.get('/self/letters', getMyLetters)

// Self — offboarding and complaints
router.get('/self/offboarding', getMyOffboarding)
router.post('/self/offboarding/resign', submitResignation)
router.get('/self/complaints', getMyComplaints)
router.post('/self/complaints', raiseComplaint)

// Manager — offboarding requests (view, update, deactivate)
router.get('/offboarding-requests', getOffboardingRequests)
router.put('/offboarding-requests/:id', updateOffboardingStatus)
router.put('/offboarding/deactivate/:employee_id', deactivateEmployee)

// Manager-initiated offboarding — check for existing active request before creating
router.post('/offboarding-requests', async (req, res) => {
  
  try {
    const { employee_id, type, reason, last_working_day, manager_notes, requested_by, status } = req.body

    // Prevent duplicate active requests for the same employee
    const existing = await pool.query(
      `SELECT id FROM offboarding_requests
       WHERE employee_id = $1 AND company_id = $2 AND status IN ('Pending', 'In Progress', 'Approved')`,
      [employee_id, req.user.company_id]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This employee already has an active offboarding request.'
      })
    }

    const result = await pool.query(
      `INSERT INTO offboarding_requests (employee_id, company_id, type, reason, last_working_day, manager_notes, requested_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [employee_id, req.user.company_id, type || 'Termination', reason, last_working_day || null, manager_notes, requested_by || 'manager', status || 'In Progress']
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Manager — complaints
router.get('/complaints', getComplaints)
router.put('/complaints/:id', respondToComplaint)

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

// Mark or update attendance for an employee, including lunch fields and working hours
router.post('/attendance/mark', async (req, res) => {
  try {
    const { user_id, date, status, clock_in, clock_out, lunch_start, lunch_end } = req.body
    const { computeWorkingMinutes } = require('../controllers/attendanceController')

    const showTimes = status === 'Present' || status === 'Late'
    const clockInVal    = showTimes ? clock_in    || null : null
    const clockOutVal   = showTimes ? clock_out   || null : null
    const lunchStartVal = showTimes ? lunch_start || null : null
    const lunchEndVal   = showTimes ? lunch_end   || null : null

    const workingMinutes = (clockInVal && clockOutVal)
      ? computeWorkingMinutes(clockInVal, clockOutVal, lunchStartVal, lunchEndVal)
      : null

    const existing = await pool.query(
      'SELECT id FROM attendance WHERE user_id=$1 AND date=$2',
      [user_id, date]
    )

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE attendance
         SET clock_in=$1, clock_out=$2, lunch_start=$3, lunch_end=$4,
             status=$5, working_minutes=$6
         WHERE user_id=$7 AND date=$8`,
        [clockInVal, clockOutVal, lunchStartVal, lunchEndVal, status, workingMinutes, user_id, date]
      )
    } else {
      await pool.query(
        `INSERT INTO attendance
           (user_id, company_id, date, clock_in, clock_out, lunch_start, lunch_end, status, working_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [user_id, req.user.company_id, date, clockInVal, clockOutVal, lunchStartVal, lunchEndVal, status, workingMinutes]
      )
    }
    res.json({ success: true, message: 'Attendance marked' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Update attendance record and recompute working_minutes from the new times
router.put('/attendance/:id', async (req, res) => {
  try {
    const { clock_in, clock_out, lunch_start, lunch_end, status } = req.body
    const { computeWorkingMinutes } = require('../controllers/attendanceController')

    const workingMinutes = (clock_in && clock_out)
      ? computeWorkingMinutes(clock_in, clock_out, lunch_start, lunch_end)
      : null

    const result = await pool.query(
      `UPDATE attendance
       SET clock_in=$1, clock_out=$2, lunch_start=$3, lunch_end=$4,
           status=$5, working_minutes=$6
       WHERE id=$7 RETURNING *`,
      [clock_in || null, clock_out || null, lunch_start || null, lunch_end || null,
       status, workingMinutes, req.params.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router