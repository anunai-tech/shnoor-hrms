const pool = require('../config/db')

// GET all companies
const getCompanies = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, s.name as subscription_name 
      FROM companies c
      LEFT JOIN subscriptions s ON c.subscription_id = s.id
      ORDER BY c.created_at DESC
    `)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST create company
const createCompany = async (req, res) => {
  try {
    const { name, email, phone, subscription_id, is_active } = req.body

    const result = await pool.query(
      `INSERT INTO companies (name, email, phone, subscription_id, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, email, phone, subscription_id || 1, is_active ?? true]
    )

    const company = result.rows[0]

    // Auto-create transaction if a paid subscription is assigned
    if (subscription_id && subscription_id != 1) {
      const subResult = await pool.query(
        'SELECT * FROM subscriptions WHERE id = $1', [subscription_id]
      )
      const sub = subResult.rows[0]
      if (sub) {
        await pool.query(
          `INSERT INTO transactions (company_id, amount, plan, type, status, payment_date)
           VALUES ($1, $2, $3, 'Monthly', 'Paid', NOW())`,
          [company.id, sub.monthly_price, sub.name]
        )
      }
    }

    res.status(201).json({ success: true, message: 'Company created', data: company })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email already exists' })
    }
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PUT update company
const updateCompany = async (req, res) => {
  try {
    const { id } = req.params
    const { name, email, phone, subscription_id, is_active } = req.body

    const result = await pool.query(
      `UPDATE companies SET name=$1, email=$2, phone=$3, subscription_id=$4, is_active=$5
       WHERE id=$6 RETURNING *`,
      [name, email, phone, subscription_id, is_active, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company not found' })
    }

    // Auto-create transaction if paid plan assigned
    if (subscription_id && subscription_id != 1) {
      const subResult = await pool.query(
        'SELECT * FROM subscriptions WHERE id = $1', [subscription_id]
      )
      const sub = subResult.rows[0]
      if (sub) {
        await pool.query(
          `INSERT INTO transactions (company_id, amount, plan, type, status, payment_date)
           VALUES ($1, $2, $3, 'Monthly', 'Paid', NOW())`,
          [result.rows[0].id, sub.monthly_price, sub.name]
        )
      }
    }

    res.json({ success: true, message: 'Company updated', data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE company
const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM companies WHERE id = $1', [id])
    res.json({ success: true, message: 'Company deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getCompanies, createCompany, updateCompany, deleteCompany }