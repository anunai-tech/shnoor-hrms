const pool = require('../config/db')

// Manager — get all expenses for company
const getExpenses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.first_name, u.last_name FROM expenses e
       JOIN users u ON e.user_id = u.id
       WHERE e.company_id=$1 ORDER BY e.created_at DESC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — approve or reject expense
const updateExpenseStatus = async (req, res) => {
  try {
    const { status } = req.body
    const result = await pool.query(
      `UPDATE expenses SET status=$1, approved_by=$2 WHERE id=$3 AND company_id=$4 RETURNING *`,
      [status, req.user.id, req.params.id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — get own expenses
const getMyExpenses = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM expenses WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — submit expense
const submitExpense = async (req, res) => {
  try {
    const { title, amount, category } = req.body
    const result = await pool.query(
      `INSERT INTO expenses (user_id, company_id, title, amount, category)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, req.user.company_id, title, amount, category]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getExpenses, updateExpenseStatus, getMyExpenses, submitExpense }