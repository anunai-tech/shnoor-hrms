const pool = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { sendEmail } = require('../utils/emailService')

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
    // check if company is suspended for non-superadmin roles
    if (['manager', 'employee'].includes(user.role)) {
      const companyResult = await pool.query(
        'SELECT status FROM companies WHERE id = $1',
        [user.company_id]
      )
      const company = companyResult.rows[0]

      if (company?.status === 'suspended') {
        const message = user.role === 'client'
          ? 'Your account has been suspended. Please contact SHNOOR support.'
          : 'Your company portal has been suspended. Please contact your company administrator.'

        return res.status(403).json({
          success: false,
          message,
          code: 'ACCOUNT_SUSPENDED'
        })
      }
    }

    // block superadmin from client login route
    if (user.role === 'superadmin') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const redirectMap = {
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

// ── Email OTP helpers (reuse password_resets table) ──────────────────────────

// Ensure purpose column exists on password_resets (safe to run on every startup)
async function ensureOtpPurposeColumn() {
  await pool.query(
    `ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'password_reset'`
  )
}
ensureOtpPurposeColumn().catch(() => {})

// POST /api/v1/auth/send-email-otp
const sendEmailOtp = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' })

    // Check if already registered
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' })
    }

    const otp       = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    await pool.query(
      `DELETE FROM password_resets WHERE email = $1 AND purpose = 'signup'`,
      [email.toLowerCase()]
    )
    await pool.query(
      `INSERT INTO password_resets (email, otp, expires_at, purpose) VALUES ($1,$2,$3,'signup')`,
      [email.toLowerCase(), otp, expiresAt]
    )

    // Fetch template from DB (falls back to inline if not configured)
    let subject = 'Your SHNOOR HRMS Verification Code'
    let text    = `Your OTP is ${otp}. It expires in 10 minutes.`
    try {
      const tplResult = await pool.query(
        "SELECT subject, body FROM email_templates WHERE key = 'signup_otp' LIMIT 1"
      )
      if (tplResult.rows.length > 0) {
        subject = tplResult.rows[0].subject.replaceAll('{{otp}}', otp)
        text    = tplResult.rows[0].body.replaceAll('{{otp}}', otp)
      }
    } catch (_) {}

    try {
      await sendEmail({ to: email.toLowerCase(), subject, text })
      res.json({ success: true, message: 'OTP sent successfully' })
    } catch (emailErr) {
      // Clean up the OTP record so it cannot be abused
      await pool.query(
        `DELETE FROM password_resets WHERE email = $1 AND purpose = 'signup'`,
        [email.toLowerCase()]
      )
      return res.status(500).json({
        success: false,
        message: 'Email service is not configured. Please contact the administrator.'
      })
    }
  } catch (err) {
    console.error('sendEmailOtp error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/v1/auth/verify-email-otp
const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'email and otp are required' })
    }

    const result = await pool.query(
      `SELECT id FROM password_resets
       WHERE email=$1 AND otp=$2 AND purpose='signup'
         AND used=false AND expires_at > NOW()`,
      [email.toLowerCase(), otp]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' })
    }

    // Mark verified (don't delete yet — register route checks it)
    await pool.query(
      `UPDATE password_resets SET used=true WHERE id=$1`,
      [result.rows[0].id]
    )

    res.json({ success: true, message: 'OTP verified' })
  } catch (err) {
    console.error('verifyEmailOtp error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}


// creates client user + company in single transaction
// Requires email OTP to have been verified first via /send-email-otp → /verify-email-otp.
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

  // Confirm email was OTP-verified before allowing registration
  const otpCheck = await pool.query(
    `SELECT id FROM password_resets
     WHERE email=$1 AND purpose='signup' AND used=true AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [email.toLowerCase()]
  ).catch(() => ({ rows: [] }))

  if (otpCheck.rows.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Email not verified. Please complete OTP verification.'
    })
  }

  const verifiedOtpId = otpCheck.rows[0].id
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

    // Clean up the used OTP record now that registration succeeded
    await pool.query('DELETE FROM password_resets WHERE id=$1', [verifiedOtpId]).catch(() => {})

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

// superadmin-only login — blocks all other roles
const superAdminLogin = async (req, res) => {
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
      [email.toLowerCase()]
    )

    // generic error — never reveal if account exists
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const user = result.rows[0]

    // block non-superadmin silently
    if (user.role !== 'superadmin') {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' })
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, company_id: user.company_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

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
        redirectTo: '/superadmin/dashboard'
      }
    })
  } catch (err) {
    console.error('superAdminLogin error:', err)
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' })
  }
}

module.exports = { login, registerClient, superAdminLogin, sendEmailOtp, verifyEmailOtp }