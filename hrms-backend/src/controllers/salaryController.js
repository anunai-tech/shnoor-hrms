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
              COALESCE(s.basic, 0) as basic,
              COALESCE(s.hra, 0) as hra,
              COALESCE(s.transport, 0) as transport,
              COALESCE(s.other_allowance, 0) as other_allowance,
              COALESCE(s.deductions, 0) as deductions,
              COALESCE(s.net_pay, 0) as net_pay
       FROM users u
       LEFT JOIN salaries s ON s.user_id = u.id AND s.company_id = $1
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
      'SELECT * FROM salaries WHERE user_id = $1',
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
      `SELECT u.id as user_id, s.basic, s.hra, s.transport, s.other_allowance, s.deductions, s.net_pay
       FROM users u
       INNER JOIN salaries s ON s.user_id = u.id AND s.company_id = $1
       WHERE u.company_id = $1 AND (u.role = 'employee' OR u.id = $2) AND u.is_active = true`,
      [req.user.company_id, req.user.id]
    )

    if (usersResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No salary records found. Configure salaries first.' })
    }

    let count = 0
    for (const row of usersResult.rows) {
      await pool.query(
        `INSERT INTO payslips (user_id, company_id, month, year, basic, hra, transport, other_allowance, deductions, net_pay, generated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (user_id, month, year)
         DO UPDATE SET basic=$5, hra=$6, transport=$7, other_allowance=$8, deductions=$9, net_pay=$10, generated_at=NOW()`,
        [row.user_id, req.user.company_id, month, year,
         row.basic, row.hra, row.transport, row.other_allowance, row.deductions, row.net_pay]
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

module.exports = { getSalaries, upsertSalary, getMySalary, runPayroll, getPayslipsByUser, getMyPayslips }