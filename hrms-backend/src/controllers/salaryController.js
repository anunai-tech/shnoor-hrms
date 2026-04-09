const pool = require('../config/db')

// Manager — get all salaries (LEFT JOIN so ALL employees show even without salary records)
const getSalaries = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id as user_id, u.first_name, u.last_name, u.designation, u.department,
              COALESCE(s.id, NULL) as id,
              COALESCE(s.basic, 0) as basic,
              COALESCE(s.hra, 0) as hra,
              COALESCE(s.transport, 0) as transport,
              COALESCE(s.other_allowance, 0) as other_allowance,
              COALESCE(s.deductions, 0) as deductions,
              COALESCE(s.net_pay, 0) as net_pay
       FROM users u
       LEFT JOIN salaries s ON s.user_id = u.id AND s.company_id = $1
       WHERE u.company_id = $1 AND u.role = 'employee'
       ORDER BY u.first_name`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — create or update salary
const upsertSalary = async (req, res) => {
  try {
    const { user_id, basic, hra, transport, other_allowance, deductions } = req.body
    const net_pay = (Number(basic) + Number(hra) + Number(transport) + Number(other_allowance)) - Number(deductions)
    const existing = await pool.query('SELECT id FROM salaries WHERE user_id=$1', [user_id])
    let result
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE salaries SET basic=$1, hra=$2, transport=$3, other_allowance=$4, deductions=$5, net_pay=$6
         WHERE user_id=$7 RETURNING *`,
        [basic, hra, transport, other_allowance, deductions, net_pay, user_id]
      )
    } else {
      result = await pool.query(
        `INSERT INTO salaries (user_id, company_id, basic, hra, transport, other_allowance, deductions, net_pay)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [user_id, req.user.company_id, basic, hra, transport, other_allowance, deductions, net_pay]
      )
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — get own salary
const getMySalary = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM salaries WHERE user_id=$1',
      [req.user.id]
    )
    res.json({ success: true, data: result.rows[0] || null })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getSalaries, upsertSalary, getMySalary }