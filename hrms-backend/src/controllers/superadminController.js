const pool = require('../config/db')
const bcrypt = require('bcryptjs')

// SUBSCRIPTIONS

const getSubscriptions = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subscriptions WHERE is_deleted = false ORDER BY id')
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createSubscription = async (req, res) => {
  const dbClient = await pool.connect()
  try {
    const { name, monthly_price, annual_price, max_users } = req.body
    await dbClient.query('BEGIN')
    const result = await dbClient.query(
      'INSERT INTO subscriptions (name, monthly_price, annual_price, max_users, is_active) VALUES ($1,$2,$3,$4,false) RETURNING *',
      [name, monthly_price, annual_price, max_users]
    )
    const newPlanId = result.rows[0].id
    const FEATURE_KEYS = ['employees','holidays','policies','expenses','salary_payslips','letters','offboarding','messaging','branding','shifts']
    const ALWAYS_ON = new Set(['employees', 'holidays', 'policies', 'shifts'])
    for (const key of FEATURE_KEYS) {
      await dbClient.query(
        'INSERT INTO plan_features (subscription_id, feature_key, is_enabled, monthly_limit) VALUES ($1,$2,$3,null) ON CONFLICT DO NOTHING',
        [newPlanId, key, ALWAYS_ON.has(key)]
      )
    }
    await dbClient.query('COMMIT')
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    await dbClient.query('ROLLBACK')
    res.status(500).json({ success: false, message: 'Server error' })
  } finally {
    dbClient.release()
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
    const result = await pool.query(
      `UPDATE subscriptions 
       SET is_deleted = true, is_active = false 
       WHERE id = $1 
       RETURNING id`,
      [req.params.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' })
    }
    res.json({ success: true, message: 'Plan deleted successfully' })
  } catch (err) {
    console.error('deleteSubscription error:', err)
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
    const newUserId = result.rows[0].id

    // Assign to company's default shift on creation
    if (company_id) {
      const defaultShift = await pool.query(
        'SELECT id FROM shifts WHERE company_id = $1 AND is_default = true LIMIT 1',
        [company_id]
      )
      if (defaultShift.rows.length) {
        await pool.query(
          `INSERT INTO shift_assignments (user_id, shift_id, company_id, effective_from, assigned_by)
           VALUES ($1, $2, $3, CURRENT_DATE, NULL)`,
          [newUserId, defaultShift.rows[0].id, company_id]
        )
      }
    }

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

// Updates website settings including invoice config fields added in migration_002.
const updateWebsiteSettings = async (req, res) => {
  try {
    const {
      logo_url, hero_title, hero_subtitle, cta_button_text, cta_button_link,
      contact_email, contact_phone, footer_text,
      invoice_company_name, invoice_address, invoice_rep_office,
      invoice_email, invoice_phone, invoice_website,
      invoice_gstin, gst_rate, invoice_prefix
    } = req.body

    const existing = await pool.query('SELECT id FROM website_settings LIMIT 1')
    let result

    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE website_settings
         SET logo_url=$1, hero_title=$2, hero_subtitle=$3, cta_button_text=$4,
             cta_button_link=$5, contact_email=$6, contact_phone=$7, footer_text=$8,
             invoice_company_name=$9, invoice_address=$10, invoice_rep_office=$11,
             invoice_email=$12, invoice_phone=$13, invoice_website=$14,
             invoice_gstin=$15, gst_rate=$16, invoice_prefix=$17,
             updated_at=NOW()
         WHERE id=$18 RETURNING *`,
        [
          logo_url, hero_title, hero_subtitle, cta_button_text,
          cta_button_link, contact_email, contact_phone, footer_text,
          invoice_company_name, invoice_address, invoice_rep_office,
          invoice_email, invoice_phone, invoice_website,
          invoice_gstin || null, gst_rate || 18, invoice_prefix || 'SHNOOR-INV',
          existing.rows[0].id
        ]
      )
    } else {
      result = await pool.query(
        `INSERT INTO website_settings
         (logo_url, hero_title, hero_subtitle, cta_button_text, cta_button_link,
          contact_email, contact_phone, footer_text,
          invoice_company_name, invoice_address, invoice_rep_office,
          invoice_email, invoice_phone, invoice_website,
          invoice_gstin, gst_rate, invoice_prefix)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          logo_url, hero_title, hero_subtitle, cta_button_text,
          cta_button_link, contact_email, contact_phone, footer_text,
          invoice_company_name, invoice_address, invoice_rep_office,
          invoice_email, invoice_phone, invoice_website,
          invoice_gstin || null, gst_rate || 18, invoice_prefix || 'SHNOOR-INV'
        ]
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

// get managers of a specific company for superadmin view
const getCompanyManagers = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone,
              designation, department, is_active, created_at
       FROM users
       WHERE company_id = $1 AND role = 'manager'
       ORDER BY created_at DESC`,
      [id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getCompanyManagers error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// get all client accounts with their company info
const getClients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone,
              u.is_active, u.created_at,
              c.id as company_id, c.name as company_name,
              c.subdomain, c.status as company_status
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.role = 'client'
       ORDER BY u.created_at DESC`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getClients error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// manually create a client account (superadmin provisioning)
const createClient = async (req, res) => {
  const { first_name, last_name, email, phone, password, company_name } = req.body

  if (!first_name || !email || !password || !company_name) {
    return res.status(400).json({ success: false, message: 'first_name, email, password and company_name are required' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, message: 'Email already exists' })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const companyResult = await client.query(
      `INSERT INTO companies (name, email, phone, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [company_name.trim(), email.toLowerCase(), phone || null]
    )
    const companyId = companyResult.rows[0].id

    const userResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, role, company_id)
       VALUES ($1,$2,$3,$4,$5,'client',$6) RETURNING id`,
      [first_name.trim(), last_name?.trim() || '', email.toLowerCase(), phone || null, password_hash, companyId]
    )

    await client.query(
      'UPDATE companies SET client_id = $1 WHERE id = $2',
      [userResult.rows[0].id, companyId]
    )

    await client.query(
      'INSERT INTO company_branding (company_id, display_name) VALUES ($1, $2)',
      [companyId, company_name.trim()]
    )

    // Seed a Default Shift so every new company has at least one shift from day one
    await client.query(
      `INSERT INTO shifts
         (company_id, name, shift_code, start_time, end_time, is_overnight,
          late_threshold_mins, half_day_threshold_mins, work_days, is_default)
       VALUES ($1, 'Default Shift', 'SHF-001', '09:00', '18:00', false, 15, 240,
               ARRAY['Mon','Tue','Wed','Thu','Fri'], true)`,
      [companyId]
    )

    await client.query('COMMIT')
    res.status(201).json({ success: true, message: 'Client created successfully' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('createClient error:', err)
    res.status(500).json({ success: false, message: 'Failed to create client' })
  } finally {
    client.release()
  }
}

// get all subdomain requests for superadmin review
const getSubdomainRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sr.id, sr.requested_subdomain, sr.status,
              sr.rejection_reason, sr.requested_at, sr.reviewed_at,
              c.name as company_name, c.email as company_email, c.id as company_id,
              u.first_name, u.last_name
       FROM subdomain_requests sr
       JOIN companies c ON sr.company_id = c.id
       LEFT JOIN users u ON u.company_id = c.id AND u.role = 'client'
       ORDER BY sr.requested_at DESC`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getSubdomainRequests error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// approve a subdomain request — sets company subdomain and activates portal
const approveSubdomainRequest = async (req, res) => {
  const { id } = req.params
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const reqResult = await client.query(
      'SELECT * FROM subdomain_requests WHERE id = $1',
      [id]
    )
    if (reqResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ success: false, message: 'Request not found' })
    }
    const request = reqResult.rows[0]

    const taken = await client.query(
      'SELECT id FROM companies WHERE subdomain = $1 AND id != $2',
      [request.requested_subdomain, request.company_id]
    )
    if (taken.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ success: false, message: 'Subdomain already taken by another company' })
    }

    await client.query(
      `UPDATE subdomain_requests
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1
       WHERE id = $2`,
      [req.user.id, id]
    )

    await client.query(
      `UPDATE companies SET subdomain = $1, status = 'active' WHERE id = $2`,
      [request.requested_subdomain, request.company_id]
    )

    await client.query('COMMIT')
    res.json({ success: true, message: 'Subdomain approved and portal activated' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('approveSubdomainRequest error:', err)
    res.status(500).json({ success: false, message: 'Failed to approve request' })
  } finally {
    client.release()
  }
}

// reject a subdomain request with optional reason
const rejectSubdomainRequest = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    await pool.query(
      `UPDATE subdomain_requests
       SET status = 'rejected', rejection_reason = $1,
           reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $3`,
      [reason || 'Rejected by admin', req.user.id, id]
    )
    res.json({ success: true, message: 'Request rejected' })
  } catch (err) {
    console.error('rejectSubdomainRequest error:', err)
    res.status(500).json({ success: false, message: 'Failed to reject request' })
  }
}

const togglePlanActive = async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE subscriptions SET is_active = NOT is_active WHERE id=$1 RETURNING id, name, is_active',
      [req.params.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get all plan features grouped by plan (for Plan Management page)
const getPlanFeatures = async (req, res) => {
  try {
    const plans = await pool.query('SELECT id, name, monthly_price, annual_price, max_users, is_active FROM subscriptions WHERE is_deleted = false ORDER BY id')
    const features = await pool.query(
      'SELECT * FROM plan_features ORDER BY subscription_id, feature_key'
    )
    const grouped = {}
    for (const row of features.rows) {
      if (!grouped[row.subscription_id]) grouped[row.subscription_id] = {}
      grouped[row.subscription_id][row.feature_key] = {
        is_enabled: row.is_enabled, monthly_limit: row.monthly_limit, updated_at: row.updated_at
      }
    }
    const data = plans.rows.map(p => ({ ...p, features: grouped[p.id] || {} }))
    res.json({ success: true, data })
  } catch (err) {
    console.error('getPlanFeatures error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Upsert a single feature config for a plan
const updatePlanFeature = async (req, res) => {
  try {
    const { subscription_id, feature_key } = req.params
    const { is_enabled, monthly_limit } = req.body
    const result = await pool.query(
      `INSERT INTO plan_features (subscription_id, feature_key, is_enabled, monthly_limit, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (subscription_id, feature_key)
       DO UPDATE SET is_enabled=$3, monthly_limit=$4, updated_at=NOW() RETURNING *`,
      [subscription_id, feature_key, is_enabled, monthly_limit ?? null]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('updatePlanFeature error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Full per-company usage snapshot for the admin drawer
const getCompanyUsage = async (req, res) => {
  try {
    const { getCompanyPlanFeatures } = require('../utils/planGating')
    const { id } = req.params
    const data = await getCompanyPlanFeatures(id)
    if (!data) return res.status(404).json({ success: false, message: 'Company not found' })
    const subResult = await pool.query(
      `SELECT cs.start_date, cs.end_date, cs.billing_type,
              c.name as company_name, c.email as company_email, c.status as company_status
       FROM companies c
       LEFT JOIN company_subscriptions cs ON cs.company_id=c.id AND cs.status='active'
       WHERE c.id=$1 LIMIT 1`,
      [id]
    )
    res.json({ success: true, data: { ...data, ...(subResult.rows[0] || {}) } })
  } catch (err) {
    console.error('getCompanyUsage error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Terminate active subscription for a company
const terminateCompanyPlan = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    await pool.query(
      `UPDATE company_subscriptions SET status='expired' WHERE company_id=$1 AND status='active'`,
      [id]
    )
    await pool.query('UPDATE companies SET subscription_id=NULL WHERE id=$1', [id])
    console.log(`Plan terminated for company ${id}. Reason: ${reason}`)
    res.json({ success: true, message: 'Plan terminated successfully' })
  } catch (err) {
    console.error('terminateCompanyPlan error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getPlanFeatures, updatePlanFeature, getCompanyUsage, terminateCompanyPlan, togglePlanActive,
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  getTransactions,
  getAdmins, getManagers, createAdmin, createManager, deleteUser, activateUser,
  getContactQueries, updateQueryStatus,
  getWebsiteSettings, updateWebsiteSettings,
  getProfile, updateProfile, changePassword,
  getClients, createClient, getCompanyManagers,
  getSubdomainRequests, approveSubdomainRequest, rejectSubdomainRequest
}