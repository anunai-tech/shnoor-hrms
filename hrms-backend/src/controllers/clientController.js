const pool = require('../config/db')
const bcrypt = require('bcryptjs')

// dashboard — company info, staff counts, portal status, subdomain request
const getDashboard = async (req, res) => {
  try {
    const companyId = req.user.company_id

    const companyResult = await pool.query(
      `SELECT c.id, c.name, c.email, c.status, c.subdomain, c.created_at,
              cb.display_name, cb.logo_url, cb.tagline
       FROM companies c
       LEFT JOIN company_branding cb ON cb.company_id = c.id
       WHERE c.id = $1`,
      [companyId]
    )

    const managerCount = await pool.query(
      `SELECT COUNT(*) FROM users
       WHERE company_id = $1 AND role = 'manager' AND is_active = true`,
      [companyId]
    )

    const employeeCount = await pool.query(
      `SELECT COUNT(*) FROM users
       WHERE company_id = $1 AND role = 'employee' AND is_active = true`,
      [companyId]
    )

    const subdomainRequest = await pool.query(
      `SELECT status, requested_subdomain, requested_at, rejection_reason
       FROM subdomain_requests
       WHERE company_id = $1
       ORDER BY requested_at DESC LIMIT 1`,
      [companyId]
    )

    const company = companyResult.rows[0]

    res.json({
      success: true,
      data: {
        company,
        stats: {
          managers: parseInt(managerCount.rows[0].count),
          employees: parseInt(employeeCount.rows[0].count)
        },
        subdomainRequest: subdomainRequest.rows[0] || null,
        portalActive: !!company?.subdomain
      }
    })
  } catch (err) {
    console.error('getDashboard error:', err)
    res.status(500).json({ success: false, message: 'Failed to load dashboard' })
  }
}

// current subscription plan for this company
const getCurrentPlan = async (req, res) => {
  try {
    const companyId = req.user.company_id

    const result = await pool.query(
      `SELECT s.id, s.name, s.monthly_price, s.annual_price, s.max_users,
              c.created_at as member_since, c.status,
              cs.billing_type, cs.start_date, cs.end_date, cs.status as sub_status
       FROM companies c
       LEFT JOIN subscriptions s ON s.id = c.subscription_id
       LEFT JOIN company_subscriptions cs
         ON cs.company_id = c.id AND cs.status = 'active'
       WHERE c.id = $1
       LIMIT 1`,
      [companyId]
    )

    res.json({ success: true, data: result.rows[0] || null })
  } catch (err) {
    console.error('getCurrentPlan error:', err)
    res.status(500).json({ success: false, message: 'Failed to load plan' })
  }
}

// usage — staff counts vs plan limits
const getUsage = async (req, res) => {
  try {
    const companyId = req.user.company_id

    const planResult = await pool.query(
      `SELECT s.max_users FROM companies c
       LEFT JOIN subscriptions s ON s.id = c.subscription_id
       WHERE c.id = $1`,
      [companyId]
    )

    const managerCount = await pool.query(
      `SELECT COUNT(*) FROM users
       WHERE company_id = $1 AND role = 'manager' AND is_active = true`,
      [companyId]
    )

    const employeeCount = await pool.query(
      `SELECT COUNT(*) FROM users
       WHERE company_id = $1 AND role = 'employee' AND is_active = true`,
      [companyId]
    )

    const maxUsers = planResult.rows[0]?.max_users || 50
    const managers = parseInt(managerCount.rows[0].count)
    const employees = parseInt(employeeCount.rows[0].count)

    res.json({
      success: true,
      data: {
        maxUsers,
        managers,
        employees,
        totalStaff: managers + employees
      }
    })
  } catch (err) {
    console.error('getUsage error:', err)
    res.status(500).json({ success: false, message: 'Failed to load usage' })
  }
}

// get latest subdomain request for this company
const getSubdomainRequest = async (req, res) => {
  try {
    const companyId = req.user.company_id

    const result = await pool.query(
      `SELECT id, requested_subdomain, status, rejection_reason, requested_at, reviewed_at
       FROM subdomain_requests
       WHERE company_id = $1
       ORDER BY requested_at DESC LIMIT 1`,
      [companyId]
    )

    // also get current approved subdomain if any
    const company = await pool.query(
      'SELECT subdomain FROM companies WHERE id = $1',
      [companyId]
    )

    res.json({
      success: true,
      data: {
        request: result.rows[0] || null,
        currentSubdomain: company.rows[0]?.subdomain || null
      }
    })
  } catch (err) {
    console.error('getSubdomainRequest error:', err)
    res.status(500).json({ success: false, message: 'Failed to load subdomain request' })
  }
}

// submit a new subdomain request
const createSubdomainRequest = async (req, res) => {
  try {
    const companyId = req.user.company_id
    const { requested_subdomain } = req.body

    if (!requested_subdomain) {
      return res.status(400).json({ success: false, message: 'Subdomain is required' })
    }

    // only lowercase letters, numbers, hyphens — no spaces
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(requested_subdomain)) {
      return res.status(400).json({
        success: false,
        message: 'Subdomain can only contain lowercase letters, numbers, and hyphens'
      })
    }

    // block reserved slugs
    const reserved = ['superadmin', 'admin', 'api', 'www', 'mail', 'app', 'shnoor']
    if (reserved.includes(requested_subdomain)) {
      return res.status(400).json({ success: false, message: 'This subdomain is reserved' })
    }

    // check if subdomain already taken by another company
    const taken = await pool.query(
      'SELECT id FROM companies WHERE subdomain = $1',
      [requested_subdomain]
    )
    if (taken.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'This subdomain is already taken' })
    }

    // check for existing pending request
    const existing = await pool.query(
      `SELECT id FROM subdomain_requests
       WHERE company_id = $1 AND status = 'pending'`,
      [companyId]
    )
    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending subdomain request'
      })
    }

    const result = await pool.query(
      `INSERT INTO subdomain_requests (company_id, requested_subdomain, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [companyId, requested_subdomain.toLowerCase()]
    )

    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('createSubdomainRequest error:', err)
    res.status(500).json({ success: false, message: 'Failed to submit request' })
  }
}

// get company branding settings
const getBranding = async (req, res) => {
  try {
    const companyId = req.user.company_id

    const result = await pool.query(
      'SELECT * FROM company_branding WHERE company_id = $1',
      [companyId]
    )

    res.json({ success: true, data: result.rows[0] || null })
  } catch (err) {
    console.error('getBranding error:', err)
    res.status(500).json({ success: false, message: 'Failed to load branding' })
  }
}

// update company branding
const updateBranding = async (req, res) => {
  try {
    const companyId = req.user.company_id
    const { display_name, tagline, logo_url, primary_color } = req.body

    const result = await pool.query(
      `UPDATE company_branding
       SET display_name = COALESCE($1, display_name),
           tagline = COALESCE($2, tagline),
           logo_url = COALESCE($3, logo_url),
           primary_color = COALESCE($4, primary_color),
           updated_at = NOW()
       WHERE company_id = $5
       RETURNING *`,
      [display_name, tagline, logo_url, primary_color, companyId]
    )

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('updateBranding error:', err)
    res.status(500).json({ success: false, message: 'Failed to update branding' })
  }
}

// change client account password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id
    const { current_password, new_password } = req.body

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Both fields are required' })
    }

    if (new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' })
    }

    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    )

    const isValid = await bcrypt.compare(current_password, userResult.rows[0].password_hash)
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' })
    }

    const hashed = await bcrypt.hash(new_password, 12)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashed, userId])

    res.json({ success: true, message: 'Password updated successfully' })
  } catch (err) {
    console.error('changePassword error:', err)
    res.status(500).json({ success: false, message: 'Failed to update password' })
  }
}

// billing transaction history for this company
const getTransactions = async (req, res) => {
  try {
    const companyId = req.user.company_id

    const result = await pool.query(
      `SELECT id, amount, plan, type, status, payment_date
       FROM transactions
       WHERE company_id = $1
       ORDER BY payment_date DESC`,
      [companyId]
    )

    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getTransactions error:', err)
    res.status(500).json({ success: false, message: 'Failed to load transactions' })
  }
}

// support — creates a contact query directed to superadmin
const createSupportTicket = async (req, res) => {
  try {
    const { subject, message } = req.body
    const { email } = req.user

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' })
    }

    // reusing contact_queries table — superadmin already reads this
    const companyResult = await pool.query(
      'SELECT name FROM companies WHERE id = $1',
      [req.user.company_id]
    )
    const companyName = companyResult.rows[0]?.name || 'Unknown'

    await pool.query(
      `INSERT INTO contact_queries (name, email, subject, message, status)
       VALUES ($1, $2, $3, $4, 'Unread')`,
      [companyName, email, subject, message]
    )

    res.status(201).json({ success: true, message: 'Support ticket submitted successfully' })
  } catch (err) {
    console.error('createSupportTicket error:', err)
    res.status(500).json({ success: false, message: 'Failed to submit ticket' })
  }
}

// get all managers for this client's company
const getManagers = async (req, res) => {
  try {
    const companyId = req.user.company_id

    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone,
              designation, department, is_active, created_at
       FROM users
       WHERE company_id = $1 AND role = 'manager'
       ORDER BY created_at DESC`,
      [companyId]
    )

    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getManagers error:', err)
    res.status(500).json({ success: false, message: 'Failed to load managers' })
  }
}

// create a manager for this client's company
const createManager = async (req, res) => {
  try {
    const companyId = req.user.company_id
    const { first_name, last_name, email, phone, password, designation, department } = req.body

    if (!first_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, email and password are required'
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users
        (first_name, last_name, email, phone, password_hash, role, company_id, designation, department)
       VALUES ($1,$2,$3,$4,$5,'manager',$6,$7,$8)
       RETURNING id, first_name, last_name, email, designation, department`,
      [
        first_name.trim(), last_name?.trim() || '',
        email.toLowerCase(), phone || null,
        password_hash, companyId,
        designation || null, department || null
      ]
    )

    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A user with this email already exists' })
    }
    console.error('createManager error:', err)
    res.status(500).json({ success: false, message: 'Failed to create manager' })
  }
}

// toggle manager active/inactive status
const toggleManager = async (req, res) => {
  try {
    const companyId = req.user.company_id
    const { id } = req.params

    // verify manager belongs to this company before updating
    const check = await pool.query(
      `SELECT id, is_active FROM users
       WHERE id = $1 AND company_id = $2 AND role = 'manager'`,
      [id, companyId]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Manager not found' })
    }

    const newStatus = !check.rows[0].is_active

    await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2',
      [newStatus, id]
    )

    res.json({
      success: true,
      message: `Manager ${newStatus ? 'activated' : 'deactivated'} successfully`
    })
  } catch (err) {
    console.error('toggleManager error:', err)
    res.status(500).json({ success: false, message: 'Failed to update manager status' })
  }
}

// get all employees for this client's company (read-only view)
const getEmployees = async (req, res) => {
  try {
    const companyId = req.user.company_id
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone,
              designation, department, is_active, joining_date, created_at
       FROM users
       WHERE company_id = $1 AND role = 'employee'
       ORDER BY created_at DESC`,
      [companyId]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getEmployees error:', err)
    res.status(500).json({ success: false, message: 'Failed to load employees' })
  }
}

module.exports = {
  getDashboard, getCurrentPlan, getUsage,
  getSubdomainRequest, createSubdomainRequest,
  getBranding, updateBranding, changePassword,
  getTransactions, createSupportTicket,
  getManagers, createManager, toggleManager,
  getEmployees
}