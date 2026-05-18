const pool = require('../config/db')
const bcrypt = require('bcryptjs')

// SUBSCRIPTIONS

const getSubscriptions = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subscriptions ORDER BY id')
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createSubscription = async (req, res) => {
  try {
    const { name, monthly_price, annual_price, max_users } = req.body
    const result = await pool.query(
      'INSERT INTO subscriptions (name, monthly_price, annual_price, max_users) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, monthly_price, annual_price, max_users]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateSubscription = async (req, res) => {
  try {
    const { name, monthly_price, annual_price, max_users } = req.body
    const result = await pool.query(
      'UPDATE subscriptions SET name=$1, monthly_price=$2, annual_price=$3, max_users=$4 WHERE id=$5 RETURNING *',
      [name, monthly_price, annual_price, max_users, req.params.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const deleteSubscription = async (req, res) => {
  try {
    await pool.query('DELETE FROM subscriptions WHERE id=$1', [req.params.id])
    res.json({ success: true, message: 'Subscription deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// TRANSACTIONS

const getTransactions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.name as company_name
       FROM transactions t
       LEFT JOIN companies c ON t.company_id = c.id
       ORDER BY t.created_at DESC`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ADMIN & MANAGER MANAGEMENT

const getAdmins = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, is_active, created_at
       FROM users WHERE role = 'superadmin' ORDER BY created_at`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getManagers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.is_active, u.created_at, c.name as company_name
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.role = 'manager' ORDER BY u.created_at`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createAdmin = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password } = req.body
    const password_hash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,'superadmin') RETURNING id, first_name, last_name, email`,
      [first_name, last_name, email, phone, password_hash]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email already exists' })
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createManager = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, password, company_id } = req.body
    const password_hash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, company_id)
       VALUES ($1,$2,$3,$4,$5,'manager',$6) RETURNING id, first_name, last_name, email`,
      [first_name, last_name, email, phone, password_hash, company_id]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email already exists' })
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Soft deactivate — user data and history remain intact
const deleteUser = async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id])
    res.json({ success: true, message: 'User deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Reactivate a previously deactivated admin or manager
const activateUser = async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_active = true WHERE id = $1', [req.params.id])
    res.json({ success: true, message: 'User activated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// CONTACT QUERIES

const getContactQueries = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contact_queries ORDER BY created_at DESC')
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateQueryStatus = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE contact_queries SET status=$1 WHERE id=$2 RETURNING *',
      [req.body.status, req.params.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// WEBSITE SETTINGS

const getWebsiteSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM website_settings LIMIT 1')
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateWebsiteSettings = async (req, res) => {
  try {
    const { logo_url, hero_title, hero_subtitle, cta_button_text, cta_button_link, contact_email, contact_phone, footer_text } = req.body
    const existing = await pool.query('SELECT id FROM website_settings LIMIT 1')
    let result
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE website_settings
         SET logo_url=$1, hero_title=$2, hero_subtitle=$3, cta_button_text=$4,
             cta_button_link=$5, contact_email=$6, contact_phone=$7, footer_text=$8, updated_at=NOW()
         WHERE id=$9 RETURNING *`,
        [logo_url, hero_title, hero_subtitle, cta_button_text, cta_button_link, contact_email, contact_phone, footer_text, existing.rows[0].id]
      )
    } else {
      result = await pool.query(
        `INSERT INTO website_settings (logo_url, hero_title, hero_subtitle, cta_button_text, cta_button_link, contact_email, contact_phone, footer_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [logo_url, hero_title, hero_subtitle, cta_button_text, cta_button_link, contact_email, contact_phone, footer_text]
      )
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PROFILE

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, first_name, last_name, email, phone, address, role, profile_photo, created_at FROM users WHERE id=$1',
      [req.user.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone, address, profile_photo } = req.body
    const result = await pool.query(
      `UPDATE users SET first_name=$1, last_name=$2, phone=$3, address=$4, profile_photo=$5
       WHERE id=$6 RETURNING id, first_name, last_name, email, phone, address, profile_photo`,
      [first_name, last_name, phone, address, profile_photo || null, req.user.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const changePassword = async (req, res) => {
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
}

module.exports = {
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  getTransactions,
  getAdmins, getManagers, createAdmin, createManager, deleteUser, activateUser,
  getContactQueries, updateQueryStatus,
  getWebsiteSettings, updateWebsiteSettings,
  getProfile, updateProfile, changePassword
}