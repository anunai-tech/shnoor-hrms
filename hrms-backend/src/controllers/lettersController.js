const pool = require('../config/db')

// Manager — generate a letter for an employee, saves to DB
const generateLetter = async (req, res) => {
  try {
    const { employee_id, letter_type, title, content } = req.body
    const result = await pool.query(
      `INSERT INTO letters (employee_id, company_id, letter_type, title, content, generated_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [employee_id, req.user.company_id, letter_type, title, content, req.user.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — get all letters generated for their company
const getLetters = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, 
              u.first_name, u.last_name, u.designation, u.department,
              g.first_name as generated_by_first, g.last_name as generated_by_last
       FROM letters l
       JOIN users u ON u.id = l.employee_id
       JOIN users g ON g.id = l.generated_by
       WHERE l.company_id = $1
       ORDER BY l.generated_at DESC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee/Self — get own letters
const getMyLetters = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM letters WHERE employee_id = $1 ORDER BY generated_at DESC`,
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { generateLetter, getLetters, getMyLetters }