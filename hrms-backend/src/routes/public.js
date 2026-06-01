const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const nodemailer = require('nodemailer')
const bcrypt = require('bcryptjs')

// Email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
})

// POST /contact
router.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body
    await pool.query(
      'INSERT INTO contact_queries (name, email, subject, message) VALUES ($1,$2,$3,$4)',
      [name, email, subject, message]
    )
    res.status(201).json({ success: true, message: 'Query submitted successfully' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /website-settings
router.get('/website-settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM website_settings LIMIT 1')
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// POST /forgot-password — company-aware OTP, validates user scope before sending
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, company_slug } = req.body

    let userResult

    if (company_slug) {
      // company subdomain — only send OTP if user belongs to this company
      userResult = await pool.query(
        `SELECT u.id, u.first_name FROM users u
         JOIN companies c ON u.company_id = c.id
         WHERE u.email = $1
           AND c.subdomain = $2
           AND u.role IN ('manager', 'employee')
           AND u.is_active = true`,
        [email.toLowerCase(), company_slug.toLowerCase()]
      )
    } else {
      // main site — only superadmin and client
      userResult = await pool.query(
        `SELECT id, first_name FROM users
         WHERE email = $1
           AND role IN ('superadmin', 'client')
           AND is_active = true`,
        [email.toLowerCase()]
      )
    }

    // don't reveal whether email exists as security best practice
    if (userResult.rows.length === 0) {
      return res.json({ success: true, message: 'If this email exists, an OTP has been sent.' })
    }

    const user = userResult.rows[0]
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expires_at = new Date(Date.now() + 10 * 60 * 1000)

    await pool.query('UPDATE password_resets SET used = true WHERE email = $1', [email])
    await pool.query(
      'INSERT INTO password_resets (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, otp, expires_at]
    )

    await transporter.sendMail({
      from: `"SHNOOR HRMS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP — SHNOOR HRMS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #1e293b; margin-bottom: 8px;">Password Reset Request</h2>
          <p style="color: #64748b; font-size: 14px;">Hi ${user.first_name},</p>
          <p style="color: #64748b; font-size: 14px;">We received a request to reset your password. Use the OTP below:</p>
          <div style="background: #fff; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #1e293b; margin: 0;">${otp}</p>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <p style="color: #94a3b8; font-size: 13px;">If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #cbd5e1; font-size: 12px; text-align: center;">SHNOOR INTERNATIONAL LLC — HR Management System</p>
        </div>
      `
    })

    res.json({ success: true, message: 'OTP sent to your email.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Failed to send OTP. Try again.' })
  }
})

// POST /reset-password — verify OTP and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body

    // Find valid OTP
    const result = await pool.query(
      `SELECT * FROM password_resets
       WHERE email = $1 AND otp = $2 AND used = false AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' })
    }

    // Hash new password
    const password_hash = await bcrypt.hash(new_password, 10)

    // Update user password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [password_hash, email]
    )

    // Mark OTP as used
    await pool.query(
      'UPDATE password_resets SET used = true WHERE id = $1',
      [result.rows[0].id]
    )

    res.json({ success: true, message: 'Password reset successfully.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error.' })
  }
})

// Public endpoint — returns all subscription plans for landing page display.
// No auth required since this is shown to visitors before they register.
router.get('/plans', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.monthly_price, s.annual_price, s.max_users,
              s.is_highlighted, s.cta_text,
              COALESCE(
                json_agg(
                  json_build_object(
                    'feature_key', pf.feature_key,
                    'is_enabled', pf.is_enabled,
                    'monthly_limit', pf.monthly_limit
                  ) ORDER BY pf.feature_key
                ) FILTER (WHERE pf.feature_key IS NOT NULL),
                '[]'::json
              ) AS plan_feature_data
       FROM subscriptions s
       LEFT JOIN plan_features pf ON pf.subscription_id = s.id
       WHERE s.is_active = true AND s.is_deleted = false
       GROUP BY s.id
       ORDER BY s.monthly_price ASC`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// GET /company-info/:subdomain — public endpoint, no auth required
// used by company landing page to fetch branding before login
router.get('/company-info/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params

    const result = await pool.query(
      `SELECT c.id, c.name, c.subdomain, c.status,
              cb.display_name, cb.tagline, cb.logo_url, cb.primary_color
       FROM companies c
       LEFT JOIN company_branding cb ON cb.company_id = c.id
       WHERE c.subdomain = $1 AND c.status IN ('active', 'suspended')
       LIMIT 1`,
      [subdomain.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company portal not found or not yet active'
      })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('company-info error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router