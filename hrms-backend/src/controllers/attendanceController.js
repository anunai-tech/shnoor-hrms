const pool = require('../config/db')

// Manager — get all attendance for company
const getAttendance = async (req, res) => {
  try {
    const { date } = req.query
    let query = `SELECT a.*, u.first_name, u.last_name 
                 FROM attendance a JOIN users u ON a.user_id = u.id
                 WHERE a.company_id=$1`
    const params = [req.user.company_id]
    if (date) { query += ` AND a.date=$2`; params.push(date) }
    query += ' ORDER BY a.date DESC'
    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — clock in
const clockIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE user_id=$1 AND date=$2',
      [req.user.id, today]
    )
    if (existing.rows.length > 0) {
      const record = existing.rows[0]
      if (record.clock_out) {
        return res.status(400).json({
          success: false,
          message: 'You have already completed your attendance for today.'
        })
      } else {
        return res.status(400).json({
          success: false,
          message: 'Already clocked in today. Please clock out first.'
        })
      }
    }
    const now = new Date().toTimeString().split(' ')[0]
    const result = await pool.query(
      `INSERT INTO attendance (user_id, company_id, date, clock_in, status)
       VALUES ($1,$2,$3,$4,'Present') RETURNING *`,
      [req.user.id, req.user.company_id, today, now]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — clock out
const clockOut = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE user_id=$1 AND date=$2',
      [req.user.id, today]
    )
    if (existing.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'You have not clocked in today.'
      })
    }
    if (existing.rows[0].clock_out) {
      return res.status(400).json({
        success: false,
        message: 'You have already clocked out today.'
      })
    }
    const now = new Date().toTimeString().split(' ')[0]
    const result = await pool.query(
      `UPDATE attendance SET clock_out=$1 WHERE user_id=$2 AND date=$3 RETURNING *`,
      [now, req.user.id, today]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — get own attendance
const getMyAttendance = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM attendance WHERE user_id=$1 ORDER BY date DESC',
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getAttendance, clockIn, clockOut, getMyAttendance }