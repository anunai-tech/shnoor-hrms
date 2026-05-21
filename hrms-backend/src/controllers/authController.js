const pool = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      })
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const user = result.rows[0]

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        company_id: user.company_id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )
    const redirectMap = {
      superadmin: '/superadmin/dashboard',
      client: '/client/dashboard',
      manager: '/manager/dashboard',
      employee: '/employee/dashboard'
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
          company_id: user.company_id
        },
        redirectTo: redirectMap[user.role] || '/'
      }
    })

  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    })
  }
}

// creates client user + company in single transaction
const registerClient = async (req, res) => {
  const { company_name, contact_name, email, password, phone } = req.body

  if (!company_name || !contact_name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'company_name, contact_name, email and password are required'
    })
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters'
    })
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const companyResult = await client.query(
      `INSERT INTO companies (name, email, phone, status)
   VALUES ($1, $2, $3, 'pending')
   RETURNING id`,
      [company_name.trim(), email.toLowerCase(), phone || null]
    )
    const companyId = companyResult.rows[0].id

    // split contact_name into first/last for users table schema
    const nameParts = contact_name.trim().split(' ')
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ') || ''

    const userResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, company_id)
   VALUES ($1, $2, $3, $4, 'client', $5)
   RETURNING id, first_name, last_name, email, role, company_id`,
      [firstName, lastName, email.toLowerCase(), hashedPassword, companyId]
    )

    const newUser = userResult.rows[0]

    await client.query(
      'UPDATE companies SET client_id = $1 WHERE id = $2',
      [newUser.id, companyId]
    )

    await client.query(
      `INSERT INTO company_branding (company_id, display_name)
       VALUES ($1, $2)`,
      [companyId, company_name.trim()]
    )

    await client.query('COMMIT')

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role, company_id: newUser.company_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: newUser.id,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          email: newUser.email,
          role: newUser.role,
          company_id: newUser.company_id
        },
        redirectTo: '/client/dashboard'
      }
    })

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('registerClient error:', err)
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    })
  } finally {
    client.release()
  }
}

module.exports = { login, registerClient }