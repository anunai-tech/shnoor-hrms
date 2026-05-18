const pool = require('../config/db')
const bcrypt = require('bcryptjs')

let hasDateOfBirthColumnCache = null

const hasDateOfBirthColumn = async () => {
  if (typeof hasDateOfBirthColumnCache === 'boolean') {
    return hasDateOfBirthColumnCache
  }
  const result = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'date_of_birth'
     ) AS exists`
  )
  hasDateOfBirthColumnCache = result.rows[0]?.exists === true
  return hasDateOfBirthColumnCache
}

// GET all employees of manager's company
const getEmployees = async (req, res) => {
  try {
    const includeDateOfBirth = await hasDateOfBirthColumn()
    const dobSelect = includeDateOfBirth ? ', date_of_birth' : ''
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, department,
              designation, joining_date, is_active, profile_photo${dobSelect}
       FROM users
       WHERE company_id = $1 AND role = 'employee'
       ORDER BY created_at DESC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// GET single employee
const getEmployee = async (req, res) => {
  try {
    const includeDateOfBirth = await hasDateOfBirthColumn()
    const dobSelect = includeDateOfBirth ? ', date_of_birth' : ''
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, department,
              designation, joining_date, is_active, profile_photo${dobSelect}, address
       FROM users WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST create employee
const createEmployee = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, department, designation, joining_date, password, date_of_birth } = req.body

    if (!first_name || !email) {
      return res.status(400).json({ success: false, message: 'First name and email are required' })
    }

    const password_hash = await bcrypt.hash(password || 'employee123', 10)
    const includeDateOfBirth = await hasDateOfBirthColumn()

    const columns = ['first_name', 'last_name', 'email', 'phone', 'department', 'designation', 'joining_date', 'password_hash', 'role', 'company_id']
    const values = [first_name, last_name || null, email, phone || null, department || null, designation || null, joining_date || null, password_hash, 'employee', req.user.company_id]

    if (includeDateOfBirth) {
      columns.push('date_of_birth')
      values.push(date_of_birth || null)
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
    const result = await pool.query(
      `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id, first_name, last_name, email`,
      values
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Email already exists' })
    }
    console.error('Create employee error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PUT update employee
const updateEmployee = async (req, res) => {
  try {
    const { first_name, last_name, phone, department, designation, joining_date, is_active, date_of_birth } = req.body
    const includeDateOfBirth = await hasDateOfBirthColumn()
    const dobClause = includeDateOfBirth ? ', date_of_birth = $8' : ''
    const params = includeDateOfBirth
      ? [first_name, last_name, phone, department, designation, joining_date, is_active, date_of_birth || null, req.params.id, req.user.company_id]
      : [first_name, last_name, phone, department, designation, joining_date, is_active, req.params.id, req.user.company_id]

    const idPos = includeDateOfBirth ? 9 : 8
    const companyPos = includeDateOfBirth ? 10 : 9

    const result = await pool.query(
      `UPDATE users SET first_name = $1, last_name = $2, phone = $3, department = $4,
              designation = $5, joining_date = $6, is_active = $7${dobClause}
       WHERE id = $${idPos} AND company_id = $${companyPos}
       RETURNING id, first_name, last_name, email`,
      params
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Update employee error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE employee — soft delete to keep all linked history intact
const deleteEmployee = async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET is_active = false WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    )
    res.json({ success: true, message: 'Employee deactivated' })
  } catch (err) {
    console.error('Delete employee error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee }