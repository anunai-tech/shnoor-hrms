/**
 * emailSettingsController.js
 * Superadmin — manage SMTP / Resend provider config, OTP verification,
 * test-send, and email template CRUD.
 *
 * DB tables used:
 *   email_settings   — provider configs (smtp, resend)
 *   email_templates  — per-event templates
 *   password_resets  — reused as OTP store (purpose column added below)
 *
 * Routes (all require superadmin auth):
 *   GET    /superadmin/email-settings            — get both provider configs
 *   PUT    /superadmin/email-settings            — save provider config
 *   POST   /superadmin/email-settings/send-otp   — send verification OTP
 *   POST   /superadmin/email-settings/verify-otp — verify OTP before saving
 *   POST   /superadmin/email-settings/test       — send test email
 *   GET    /superadmin/email-settings/templates  — list all templates
 *   PUT    /superadmin/email-settings/templates  — upsert all templates
 */

const pool                    = require('../config/db')
const { sendEmail, DEFAULT_TEMPLATES, diagnoseEmailConfig } = require('../utils/emailService')

// ── Helpers ───────────────────────────────────────────────────────────────────

// Ensure the email_settings table exists (created once, then cached).
// If you prefer a migration file, remove this call and add the DDL to your migrations.
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_settings (
      id           SERIAL PRIMARY KEY,
      provider     VARCHAR(20) NOT NULL UNIQUE CHECK (provider IN ('smtp', 'resend')),
      host         VARCHAR(255),
      port         VARCHAR(10),
      username     VARCHAR(255),
      password     TEXT,
      encryption   VARCHAR(10) DEFAULT 'tls',
      api_key      TEXT,
      from_name    VARCHAR(255),
      from_email   VARCHAR(255),
      is_active    BOOLEAN DEFAULT false,
      updated_at   TIMESTAMP DEFAULT NOW()
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      id         SERIAL PRIMARY KEY,
      key        VARCHAR(100) NOT NULL UNIQUE,
      subject    TEXT NOT NULL,
      body       TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)

  // Reuse password_resets for email-settings OTP; add purpose column if absent.
  await pool.query(`
    ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'password_reset'
  `)
}

// ── GET /superadmin/email-settings ────────────────────────────────────────────
const getEmailSettings = async (req, res) => {
  try {
    await ensureTables()
    const result = await pool.query('SELECT * FROM email_settings ORDER BY id')
    // Return as object keyed by provider, masking sensitive values
    const data = {}
    for (const row of result.rows) {
      data[row.provider] = {
        id:         row.id,
        provider:   row.provider,
        host:       row.host || '',
        port:       row.port || '',
        username:   row.username || '',
        password:   row.password ? '••••••••' : '',   // never expose plaintext
        encryption: row.encryption || 'tls',
        api_key:    row.api_key ? '••••••••' : '',
        from_name:  row.from_name || '',
        from_email: row.from_email || '',
        is_active:  row.is_active,
      }
    }
    res.json({ success: true, data })
  } catch (err) {
    console.error('getEmailSettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── PUT /superadmin/email-settings ────────────────────────────────────────────
// Body: { provider, host?, port?, username?, password?, encryption?,
//          api_key?, from_name, from_email, is_active }
// If is_active=true we deactivate the other provider first.
const updateEmailSettings = async (req, res) => {
  try {
    await ensureTables()
    const {
      provider, host, port, username, password, encryption,
      api_key, from_name, from_email, is_active
    } = req.body

    if (!provider || !['smtp', 'resend'].includes(provider)) {
      return res.status(400).json({ success: false, message: 'provider must be smtp or resend' })
    }

    const dbClient = await pool.connect()
    try {
      await dbClient.query('BEGIN')

      // If activating this provider, deactivate the other one.
      if (is_active) {
        await dbClient.query(
          'UPDATE email_settings SET is_active = false WHERE provider != $1',
          [provider]
        )
      }

      // Build the update — only overwrite password/api_key if a real value was sent
      // (not the masked placeholder '••••••••').
      const passwordVal = (password && password !== '••••••••') ? password : null
      const apiKeyVal   = (api_key && api_key !== '••••••••')   ? api_key  : null

      await dbClient.query(`
        INSERT INTO email_settings
          (provider, host, port, username, password, encryption, api_key, from_name, from_email, is_active, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
        ON CONFLICT (provider) DO UPDATE SET
          host       = EXCLUDED.host,
          port       = EXCLUDED.port,
          username   = EXCLUDED.username,
          password   = COALESCE(EXCLUDED.password, email_settings.password),
          encryption = EXCLUDED.encryption,
          api_key    = COALESCE(EXCLUDED.api_key, email_settings.api_key),
          from_name  = EXCLUDED.from_name,
          from_email = EXCLUDED.from_email,
          is_active  = EXCLUDED.is_active,
          updated_at = NOW()
      `, [provider, host||null, port||null, username||null, passwordVal, encryption||'tls', apiKeyVal, from_name||null, from_email||null, !!is_active])

      await dbClient.query('COMMIT')
      res.json({ success: true, message: 'Email settings saved' })
    } catch (err) {
      await dbClient.query('ROLLBACK')
      throw err
    } finally {
      dbClient.release()
    }
  } catch (err) {
    console.error('updateEmailSettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── POST /superadmin/email-settings/send-otp ─────────────────────────────────
// Sends a 6-digit OTP to the supplied email using the currently active provider.
// Used to verify the superadmin owns the from_email before saving settings.
const sendEmailSettingsOtp = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ success: false, message: 'email is required' })

    const otp       = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    await pool.query(
      `DELETE FROM password_resets WHERE email = $1 AND purpose = 'email_settings'`,
      [email]
    )
    await pool.query(
      `INSERT INTO password_resets (email, otp, expires_at, purpose) VALUES ($1,$2,$3,'email_settings')`,
      [email, otp, expiresAt]
    )

    await sendEmail({
      to:      email,
      subject: 'SHNOOR HRMS — Email Settings Verification',
      text:    `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.`,
    })

    res.json({ success: true, message: 'OTP sent' })
  } catch (err) {
    console.error('sendEmailSettingsOtp error:', err)
    res.status(500).json({
      success: false,
      message: err.message || 'Could not send OTP. Please check your email settings first.'
    })
  }
}

// ── POST /superadmin/email-settings/verify-otp ───────────────────────────────
const verifyEmailSettingsOtp = async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'email and otp are required' })
    }

    const result = await pool.query(
      `SELECT id FROM password_resets
       WHERE email=$1 AND otp=$2 AND purpose='email_settings'
         AND used=false AND expires_at > NOW()`,
      [email, otp]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' })
    }

    await pool.query(
      `UPDATE password_resets SET used=true WHERE id=$1`,
      [result.rows[0].id]
    )

    res.json({ success: true, message: 'OTP verified' })
  } catch (err) {
    console.error('verifyEmailSettingsOtp error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── POST /superadmin/email-settings/test ─────────────────────────────────────
// Body: { to, provider? }
const testEmailSettings = async (req, res) => {
  try {
    const { to, provider } = req.body
    if (!to) return res.status(400).json({ success: false, message: 'to is required' })

    await sendEmail({
      to,
      subject: 'SHNOOR HRMS — Test Email',
      text:    `This is a test email from SHNOOR HRMS sent via ${(provider || 'active provider').toUpperCase()}.\n\nYour email configuration is working correctly.`,
      provider: provider || null,
    })

    res.json({ success: true, message: 'Test email sent successfully' })
  } catch (err) {
    console.error('testEmailSettings error:', err)
    res.status(500).json({ success: false, message: err.message || 'Failed to send test email' })
  }
}

// ── GET /superadmin/email-settings/templates ─────────────────────────────────
const getEmailTemplates = async (req, res) => {
  try {
    await ensureTables()
    const result = await pool.query('SELECT key, subject, body FROM email_templates ORDER BY key')

    // Merge DB rows with defaults so frontend always gets all 4 keys
    const data = { ...DEFAULT_TEMPLATES }
    for (const row of result.rows) {
      data[row.key] = { subject: row.subject, body: row.body }
    }

    res.json({ success: true, data })
  } catch (err) {
    console.error('getEmailTemplates error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── PUT /superadmin/email-settings/templates ─────────────────────────────────
// Body: { payment_verified: {subject, body}, payment_rejected: {...}, ... }
const updateEmailTemplates = async (req, res) => {
  try {
    await ensureTables()
    const templates = req.body

    if (!templates || typeof templates !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid templates payload' })
    }

    for (const [key, value] of Object.entries(templates)) {
      if (!value?.subject || !value?.body) continue
      await pool.query(`
        INSERT INTO email_templates (key, subject, body, updated_at)
        VALUES ($1,$2,$3,NOW())
        ON CONFLICT (key) DO UPDATE SET
          subject    = EXCLUDED.subject,
          body       = EXCLUDED.body,
          updated_at = NOW()
      `, [key, value.subject, value.body])
    }

    res.json({ success: true, message: 'Templates saved' })
  } catch (err) {
    console.error('updateEmailTemplates error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── GET /superadmin/email-settings/smtp ──────────────────────────────────────
// Returns the smtp row with has_password flag (never returns plaintext password).
const getSmtpSettings = async (req, res) => {
  try {
    await ensureTables()
    const result = await pool.query("SELECT * FROM email_settings WHERE provider='smtp'")
    const row = result.rows[0]
    if (!row) return res.json({ success: true, data: null })
    res.json({
      success: true,
      data: {
        host:         row.host || '',
        port:         row.port || '587',
        username:     row.username || '',
        encryption:   row.encryption || 'tls',
        from_name:    row.from_name || '',
        from_email:   row.from_email || '',
        is_active:    row.is_active,
        has_password: !!row.password,
      },
    })
  } catch (err) {
    console.error('getSmtpSettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── PUT /superadmin/email-settings/smtp ──────────────────────────────────────
const updateSmtpSettings = async (req, res) => {
  try {
    await ensureTables()
    const { host, port, username, password, encryption, from_name, from_email, is_active } = req.body

    if (!host || !username || !from_email) {
      return res.status(400).json({ success: false, message: 'host, username, and from_email are required' })
    }

    const passwordVal = (password && password !== '••••••••') ? password : null

    const dbClient = await pool.connect()
    try {
      await dbClient.query('BEGIN')
      if (is_active) {
        await dbClient.query("UPDATE email_settings SET is_active=false WHERE provider='resend'")
      }
      await dbClient.query(`
        INSERT INTO email_settings
          (provider, host, port, username, password, encryption, from_name, from_email, is_active, updated_at)
        VALUES ('smtp',$1,$2,$3,$4,$5,$6,$7,$8,NOW())
        ON CONFLICT (provider) DO UPDATE SET
          host       = EXCLUDED.host,
          port       = EXCLUDED.port,
          username   = EXCLUDED.username,
          password   = COALESCE(EXCLUDED.password, email_settings.password),
          encryption = EXCLUDED.encryption,
          from_name  = EXCLUDED.from_name,
          from_email = EXCLUDED.from_email,
          is_active  = EXCLUDED.is_active,
          updated_at = NOW()
      `, [host, port||'587', username, passwordVal, encryption||'tls', from_name||null, from_email, !!is_active])
      await dbClient.query('COMMIT')
      res.json({ success: true, message: 'SMTP settings saved' })
    } catch (err) {
      await dbClient.query('ROLLBACK')
      throw err
    } finally {
      dbClient.release()
    }
  } catch (err) {
    console.error('updateSmtpSettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── GET /superadmin/email-settings/resend ─────────────────────────────────────
const getResendSettings = async (req, res) => {
  try {
    await ensureTables()
    const result = await pool.query("SELECT * FROM email_settings WHERE provider='resend'")
    const row = result.rows[0]
    if (!row) return res.json({ success: true, data: null })
    res.json({
      success: true,
      data: {
        from_name:   row.from_name || '',
        from_email:  row.from_email || '',
        is_active:   row.is_active,
        has_api_key: !!row.api_key,
      },
    })
  } catch (err) {
    console.error('getResendSettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── PUT /superadmin/email-settings/resend ─────────────────────────────────────
const updateResendSettings = async (req, res) => {
  try {
    await ensureTables()
    const { api_key, from_name, from_email, is_active } = req.body

    if (!from_email) {
      return res.status(400).json({ success: false, message: 'from_email is required' })
    }

    const apiKeyVal = (api_key && api_key !== '••••••••') ? api_key : null

    // Check if this is the first save — require an api_key if none is stored yet
    const existing = await pool.query("SELECT api_key FROM email_settings WHERE provider='resend'")
    const hasExistingKey = existing.rows[0]?.api_key
    if (!hasExistingKey && !apiKeyVal) {
      return res.status(400).json({ success: false, message: 'API key is required' })
    }

    const dbClient = await pool.connect()
    try {
      await dbClient.query('BEGIN')
      if (is_active) {
        await dbClient.query("UPDATE email_settings SET is_active=false WHERE provider='smtp'")
      }
      await dbClient.query(`
        INSERT INTO email_settings
          (provider, api_key, from_name, from_email, is_active, updated_at)
        VALUES ('resend',$1,$2,$3,$4,NOW())
        ON CONFLICT (provider) DO UPDATE SET
          api_key    = COALESCE(EXCLUDED.api_key, email_settings.api_key),
          from_name  = EXCLUDED.from_name,
          from_email = EXCLUDED.from_email,
          is_active  = EXCLUDED.is_active,
          updated_at = NOW()
      `, [apiKeyVal, from_name||null, from_email, !!is_active])
      await dbClient.query('COMMIT')
      res.json({ success: true, message: 'Resend settings saved' })
    } catch (err) {
      await dbClient.query('ROLLBACK')
      throw err
    } finally {
      dbClient.release()
    }
  } catch (err) {
    console.error('updateResendSettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── GET /superadmin/email-settings/diagnose ───────────────────────────────────
// Returns a plain-English diagnosis of why emails may not be sending.
const diagnoseEmail = async (req, res) => {
  try {
    const result = await diagnoseEmailConfig()
    res.json({ success: true, data: result })
  } catch (err) {
    console.error('diagnoseEmail error:', err)
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = {
  getEmailSettings,
  updateEmailSettings,
  getSmtpSettings,
  updateSmtpSettings,
  getResendSettings,
  updateResendSettings,
  sendEmailSettingsOtp,
  verifyEmailSettingsOtp,
  testEmailSettings,
  getEmailTemplates,
  updateEmailTemplates,
  diagnoseEmail,
}