const pool = require('../config/db')

// Manager — get all leaves for company
const getLeaves = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.first_name, u.last_name
       FROM leaves l
       JOIN users u ON l.user_id = u.id
       WHERE l.company_id=$1 ORDER BY l.created_at DESC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — approve or reject leave
const updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body
    const result = await pool.query(
      `UPDATE leaves SET status=$1, approved_by=$2 WHERE id=$3 AND company_id=$4 RETURNING *`,
      [status, req.user.id, req.params.id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — get own leaves
const getMyLeaves = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM leaves WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — apply for leave
const applyLeave = async (req, res) => {
  try {
    const { leave_type, start_date, end_date, days, reason } = req.body
    const result = await pool.query(
      `INSERT INTO leaves (user_id, company_id, leave_type, start_date, end_date, days, reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, req.user.company_id, leave_type, start_date, end_date, days, reason]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getLeaves, updateLeaveStatus, getMyLeaves, applyLeave }