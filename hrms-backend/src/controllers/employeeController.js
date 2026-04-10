const pool = require('../config/db')
const bcrypt = require('bcryptjs')

// GET all employees of manager's company
const getEmployees = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, department, 
              designation, joining_date, date_of_birth, is_active
       FROM users 
       WHERE company_id=$1 AND role='employee'
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
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, department,
              designation, joining_date, date_of_birth, is_active, address
       FROM users WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.user.company_id]
    )
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Employee not found' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST create employee
const createEmployee = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, department, designation, joining_date, date_of_birth, password } = req.body

    if (!first_name || !email) {
      return res.status(400).json({ success: false, message: 'First name and email are required' })
    }

    const password_hash = await bcrypt.hash(password || 'employee123', 10)
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, phone, department, designation, 
                          joining_date, date_of_birth, password_hash, role, company_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'employee',$10) RETURNING id, first_name, last_name, email`,
      [first_name, last_name, email, phone, department, designation, joining_date, date_of_birth, password_hash, req.user.company_id]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email already exists' })
    console.error('Create employee error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// PUT update employee
const updateEmployee = async (req, res) => {
  try {
    const { first_name, last_name, phone, department, designation, joining_date, date_of_birth, is_active } = req.body
    const result = await pool.query(
      `UPDATE users SET first_name=$1, last_name=$2, phone=$3, department=$4,
              designation=$5, joining_date=$6, date_of_birth=$7, is_active=$8
       WHERE id=$9 AND company_id=$10 RETURNING id, first_name, last_name, email`,
      [first_name, last_name, phone, department, designation, joining_date, date_of_birth, is_active, req.params.id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Update employee error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE employee
const deleteEmployee = async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id])
    res.json({ success: true, message: 'Employee deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee }
