const pool = require('../config/db')

// ── HOLIDAYS ──────────────────────────────────────────────

const getHolidays = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM holidays WHERE company_id=$1 ORDER BY date',
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createHoliday = async (req, res) => {
  try {
    const { name, date } = req.body
    const result = await pool.query(
      'INSERT INTO holidays (company_id, name, date) VALUES ($1,$2,$3) RETURNING *',
      [req.user.company_id, name, date]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const deleteHoliday = async (req, res) => {
  try {
    await pool.query('DELETE FROM holidays WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id])
    res.json({ success: true, message: 'Holiday deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── COMPANY POLICIES ──────────────────────────────────────

const getPolicies = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM company_policies WHERE company_id=$1 ORDER BY created_at DESC',
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createPolicy = async (req, res) => {
  try {
    const { title, content } = req.body
    const result = await pool.query(
      'INSERT INTO company_policies (company_id, title, content) VALUES ($1,$2,$3) RETURNING *',
      [req.user.company_id, title, content]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const deletePolicy = async (req, res) => {
  try {
    await pool.query('DELETE FROM company_policies WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id])
    res.json({ success: true, message: 'Policy deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── MANAGER PROFILE + SETTINGS ────────────────────────────

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, address, department, designation, role, profile_photo
       FROM users WHERE id=$1`,
      [req.user.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone, address, designation, department, profile_photo } = req.body
    const result = await pool.query(
      `UPDATE users SET first_name=$1, last_name=$2, phone=$3, address=$4, 
       designation=$5, department=$6, profile_photo=$7
       WHERE id=$8 RETURNING id, first_name, last_name, email, phone, address, designation, department, profile_photo`,
      [first_name, last_name, phone, address, designation || null, department || null, profile_photo || null, req.user.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
// ── DASHBOARD STATS ───────────────────────────────────────

const getDashboardStats = async (req, res) => {
  try {
    const company_id = req.user.company_id
    const total = await pool.query(`SELECT COUNT(*) FROM users WHERE company_id=$1 AND role='employee'`, [company_id])
    const active = await pool.query(`SELECT COUNT(*) FROM users WHERE company_id=$1 AND role='employee' AND is_active=true`, [company_id])
    const pendingLeaves = await pool.query(`SELECT COUNT(*) FROM leaves WHERE company_id=$1 AND status='Pending'`, [company_id])
    const pendingExpenses = await pool.query(`SELECT COUNT(*) FROM expenses WHERE company_id=$1 AND status='Pending'`, [company_id])
    res.json({
      success: true,
      data: {
        total_employees: total.rows[0].count,
        active_employees: active.rows[0].count,
        pending_leaves: pendingLeaves.rows[0].count,
        pending_expenses: pendingExpenses.rows[0].count,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getHolidays, createHoliday, deleteHoliday,
  getPolicies, createPolicy, deletePolicy,
  getProfile, updateProfile,
  getDashboardStats
}