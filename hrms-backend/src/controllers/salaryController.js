const pool = require('../config/db')
const { checkFeatureAccess } = require('../utils/planGating')

// Manager — get all salaries for the company (includes manager's own row)
const getSalaries = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'salary_payslips')
    if (!gate.allowed) return res.status(403).json({ success: false, code: 'FEATURE_GATED', feature: 'salary_payslips' })
    const result = await pool.query(
      `SELECT u.id as user_id, u.first_name, u.last_name, u.designation, u.department, u.role,
              COALESCE(s.id, NULL) as id,
              COALESCE(s.basic, d.default_salary, 0) as basic,
              COALESCE(s.hra, 0) as hra,
              COALESCE(s.transport, 0) as transport,
              COALESCE(s.other_allowance, 0) as other_allowance,
              COALESCE(s.deductions, 0) as deductions,
              COALESCE(s.net_pay, d.default_salary, 0) as net_pay,
              (SELECT hours_deduction FROM payslips WHERE user_id = u.id ORDER BY year DESC, month DESC LIMIT 1) as hours_deduction,
              (SELECT net_pay FROM payslips WHERE user_id = u.id ORDER BY year DESC, month DESC LIMIT 1) as latest_net_pay
       FROM users u
       LEFT JOIN salaries s ON s.user_id = u.id AND s.company_id = $1
       LEFT JOIN designations d ON d.name = u.designation AND d.company_id = $1
       WHERE u.company_id = $1 AND (u.role = 'employee' OR u.id = $2) AND u.is_active = true
       ORDER BY u.role DESC, u.first_name`,
      [req.user.company_id, req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — create or update salary for any user in the company
const upsertSalary = async (req, res) => {
  try {
    const { user_id, basic, hra, transport, other_allowance, deductions } = req.body
    const net_pay = (Number(basic) + Number(hra) + Number(transport) + Number(other_allowance)) - Number(deductions)

    const existing = await pool.query(
      'SELECT id FROM salaries WHERE user_id = $1 AND company_id = $2',
      [user_id, req.user.company_id]
    )

    let result
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE salaries SET basic = $1, hra = $2, transport = $3, other_allowance = $4, deductions = $5, net_pay = $6
         WHERE user_id = $7 AND company_id = $8 RETURNING *`,
        [basic, hra, transport, other_allowance, deductions, net_pay, user_id, req.user.company_id]
      )
    } else {
      result = await pool.query(
        `INSERT INTO salaries (user_id, company_id, basic, hra, transport, other_allowance, deductions, net_pay)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [user_id, req.user.company_id, basic, hra, transport, other_allowance, deductions, net_pay]
      )
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee / Manager self — get own current salary
const getMySalary = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'salary_payslips')
    if (!gate.allowed) return res.status(403).json({ success: false, code: 'FEATURE_GATED', feature: 'salary_payslips' })
    const result = await pool.query(
      `SELECT COALESCE(s.id, NULL) as id,
              COALESCE(s.basic, d.default_salary, 0) as basic,
              COALESCE(s.hra, 0) as hra,
              COALESCE(s.transport, 0) as transport,
              COALESCE(s.other_allowance, 0) as other_allowance,
              COALESCE(s.deductions, 0) as deductions,
              COALESCE(s.net_pay, d.default_salary, 0) as net_pay
       FROM users u
       LEFT JOIN salaries s ON s.user_id = u.id
       LEFT JOIN designations d ON d.name = u.designation AND d.company_id = u.company_id
       WHERE u.id = $1`,
      [req.user.id]
    )
    res.json({ success: true, data: result.rows[0] || null })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — run payroll for a given month/year
const runPayroll = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'salary_payslips')
    if (!gate.allowed) {
      return res.status(403).json({ success: false, code: 'FEATURE_GATED', feature: 'salary_payslips', message: 'Salary & Payslips are not included in your current plan.' })
    }
    const { month, year } = req.body

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' })
    }

    const usersResult = await pool.query(
      `SELECT u.id as user_id, s.basic, s.hra, s.transport, s.other_allowance, s.deductions, s.net_pay,
              COALESCE(d.expected_working_hours, 8) as expected_working_hours
       FROM users u
       INNER JOIN salaries s ON s.user_id = u.id AND s.company_id = $1
       LEFT JOIN designations d ON d.name = u.designation AND d.company_id = $1
       WHERE u.company_id = $1 AND (u.role = 'employee' OR u.id = $2) AND u.is_active = true`,
      [req.user.company_id, req.user.id]
    )

    if (usersResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No salary records found. Configure salaries first.' })
    }

    // 1. Calculate Expected Days in Month
    const settingsResult = await pool.query('SELECT * FROM company_settings WHERE company_id = $1', [req.user.company_id])
    const workDays = settingsResult.rows.length > 0 && settingsResult.rows[0].work_days ? settingsResult.rows[0].work_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

    const holResult = await pool.query(
      `SELECT date FROM holidays WHERE company_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`,
      [req.user.company_id, year, month]
    )
    const holidayMap = {}

    holResult.rows.forEach(h => {
      const ds = typeof h.date === 'string' ? h.date.substring(0, 10) : h.date.toISOString().substring(0, 10)
      holidayMap[ds] = true
    })

    const daysInMonth = new Date(year, month, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let totalWorkingDaysInMonth = 0
    let expectedDaysSoFar = 0
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const jsDate = new Date(`${dateStr}T00:00:00`)
      const dayName = DAY_NAMES[jsDate.getDay()]
      
      if (workDays.includes(dayName) && !holidayMap[dateStr]) {
        totalWorkingDaysInMonth++
        if (jsDate <= today) {
          expectedDaysSoFar++
        }
      }
    }

    const attResult = await pool.query(
      `SELECT user_id, SUM(working_minutes) as total_mins
       FROM attendance
       WHERE company_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
       GROUP BY user_id`,
      [req.user.company_id, year, month]
    )
    const actualMinutesMap = {}
    attResult.rows.forEach(r => actualMinutesMap[r.user_id] = Number(r.total_mins))

    let count = 0
    for (const row of usersResult.rows) {
      const actualMinutes = actualMinutesMap[row.user_id] || 0
      const actualHours = actualMinutes / 60
      
      const totalExpectedHoursInMonth = totalWorkingDaysInMonth * Number(row.expected_working_hours)
      const expectedHoursSoFar = expectedDaysSoFar * Number(row.expected_working_hours)
      
      const missedHours = Math.max(0, expectedHoursSoFar - actualHours)
      const grossSalary = Number(row.basic) + Number(row.hra) + Number(row.transport) + Number(row.other_allowance)
      const hourlyRate = totalExpectedHoursInMonth > 0 ? (grossSalary / totalExpectedHoursInMonth) : 0
      
      const hoursDeduction = missedHours * hourlyRate
      const payableGross = grossSalary - hoursDeduction
      const finalNetPay = Math.max(0, payableGross - Number(row.deductions))

      await pool.query(
        `INSERT INTO payslips (user_id, company_id, month, year, basic, hra, transport, other_allowance, deductions, hours_deduction, net_pay, generated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (user_id, month, year)
         DO UPDATE SET basic=$5, hra=$6, transport=$7, other_allowance=$8, deductions=$9, hours_deduction=$10, net_pay=$11, generated_at=NOW()`,
        [row.user_id, req.user.company_id, month, year,
         Number(row.basic), row.hra, row.transport, row.other_allowance, row.deductions, hoursDeduction, finalNetPay]
      )
      count++
    }

    const warn = gate.warning ? { warning: true, remaining: gate.remaining, warningMessage: `${gate.remaining} payslip${gate.remaining !== 1 ? 's' : ''} remaining this month.` } : {}
    res.json({ success: true, message: `Payroll generated for ${count} employee(s)`, count, ...warn })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — get payslip history for a specific user
const getPayslipsByUser = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'salary_payslips')
    if (!gate.allowed) return res.status(403).json({ success: false, code: 'FEATURE_GATED', feature: 'salary_payslips' })
    const result = await pool.query(
      'SELECT * FROM payslips WHERE user_id = $1 AND company_id = $2 ORDER BY year DESC, month DESC',
      [req.params.user_id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee / Manager self — get own payslip history
const getMyPayslips = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'salary_payslips')
    if (!gate.allowed) return res.status(403).json({ success: false, code: 'FEATURE_GATED', feature: 'salary_payslips' })
    const result = await pool.query(
      'SELECT * FROM payslips WHERE user_id = $1 ORDER BY year DESC, month DESC',
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — get all payslips for the company for a specific year
const getAllPayslipsByYear = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'salary_payslips')
    if (!gate.allowed) return res.status(403).json({ success: false, code: 'FEATURE_GATED', feature: 'salary_payslips' })
    const year = req.query.year || new Date().getFullYear()
    const result = await pool.query(
      'SELECT * FROM payslips WHERE company_id = $1 AND year = $2',
      [req.user.company_id, year]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — preview payroll for a given month/year without saving
const getPayrollPreview = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'salary_payslips')
    if (!gate.allowed) return res.status(403).json({ success: false, code: 'FEATURE_GATED', feature: 'salary_payslips' })
    const { month, year } = req.query

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' })
    }

    const usersResult = await pool.query(
      `SELECT u.id as user_id, s.basic, s.hra, s.transport, s.other_allowance, s.deductions, s.net_pay,
              COALESCE(d.expected_working_hours, 8) as expected_working_hours
       FROM users u
       INNER JOIN salaries s ON s.user_id = u.id AND s.company_id = $1
       LEFT JOIN designations d ON d.name = u.designation AND d.company_id = $1
       WHERE u.company_id = $1 AND (u.role = 'employee' OR u.id = $2) AND u.is_active = true`,
      [req.user.company_id, req.user.id]
    )

    if (usersResult.rows.length === 0) return res.json({ success: true, data: [] })

    const settingsResult = await pool.query('SELECT * FROM company_settings WHERE company_id = $1', [req.user.company_id])
    const workDays = settingsResult.rows.length > 0 && settingsResult.rows[0].work_days ? settingsResult.rows[0].work_days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

    const holResult = await pool.query(
      `SELECT date FROM holidays WHERE company_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3`,
      [req.user.company_id, year, month]
    )
    const holidayMap = {}
    holResult.rows.forEach(h => {
      const ds = typeof h.date === 'string' ? h.date.substring(0, 10) : h.date.toISOString().substring(0, 10)
      holidayMap[ds] = true
    })


    const daysInMonth = new Date(year, month, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let totalWorkingDaysInMonth = 0
    let expectedDaysSoFar = 0
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const jsDate = new Date(`${dateStr}T00:00:00`)
      const dayName = DAY_NAMES[jsDate.getDay()]
      
      if (workDays.includes(dayName) && !holidayMap[dateStr]) {
        totalWorkingDaysInMonth++
        if (jsDate <= today) {
          expectedDaysSoFar++
        }
      }
    }

    const attResult = await pool.query(
      `SELECT user_id, SUM(working_minutes) as total_mins
       FROM attendance
       WHERE company_id = $1 AND EXTRACT(YEAR FROM date) = $2 AND EXTRACT(MONTH FROM date) = $3
       GROUP BY user_id`,
      [req.user.company_id, year, month]
    )
    const actualMinutesMap = {}
    attResult.rows.forEach(r => actualMinutesMap[r.user_id] = Number(r.total_mins))

    const previewData = []
    for (const row of usersResult.rows) {
      const actualMinutes = actualMinutesMap[row.user_id] || 0
      const actualHours = actualMinutes / 60
      
      const totalExpectedHoursInMonth = totalWorkingDaysInMonth * Number(row.expected_working_hours)
      const expectedHoursSoFar = expectedDaysSoFar * Number(row.expected_working_hours)
      
      const missedHours = Math.max(0, expectedHoursSoFar - actualHours)
      const grossSalary = Number(row.basic) + Number(row.hra) + Number(row.transport) + Number(row.other_allowance)
      const hourlyRate = totalExpectedHoursInMonth > 0 ? (grossSalary / totalExpectedHoursInMonth) : 0
      
      const hoursDeduction = missedHours * hourlyRate
      const payableGross = grossSalary - hoursDeduction
      const finalNetPay = Math.max(0, payableGross - Number(row.deductions))

      previewData.push({
        user_id: row.user_id,
        month: Number(month),
        year: Number(year),
        basic: Number(row.basic),
        hra: Number(row.hra),
        transport: Number(row.transport),
        other_allowance: Number(row.other_allowance),
        deductions: Number(row.deductions),
        hours_deduction: hoursDeduction,
        net_pay: finalNetPay
      })
    }
    res.json({ success: true, data: previewData })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getSalaries, upsertSalary, getMySalary, runPayroll, getPayslipsByUser, getMyPayslips, getAllPayslipsByYear, getPayrollPreview }