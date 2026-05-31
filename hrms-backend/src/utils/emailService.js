/**
 * emailService.js
 * Shared email utility — reads provider config from the DB at send time.
 * Supports SMTP (via nodemailer) and Resend API.
 *
 * Tables used:
 *   email_settings   — one row per provider ('smtp' | 'resend')
 *   email_templates  — one row per template key
 */

const nodemailer = require('nodemailer')
const { Resend }  = require('resend')
const pool        = require('../config/db')

// ── Fill {{placeholder}} tokens in a template string ──────────────────────────
function fillTemplate(text, vars = {}) {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replaceAll(`{{${key}}}`, val ?? ''),
    text
  )
}

// ── Load the first active provider config from DB ─────────────────────────────
async function getActiveConfig() {
  const result = await pool.query(
    "SELECT * FROM email_settings WHERE is_active = true ORDER BY id LIMIT 1"
  )
  const row = result.rows[0] || null
  if (!row) {
    const all = await pool.query("SELECT id, provider, is_active, from_email FROM email_settings")
    console.error('[emailService] getActiveConfig: NO active row. All rows:', JSON.stringify(all.rows))
  } else {
    console.log('[emailService] getActiveConfig: active provider=' + row.provider + ' from=' + row.from_email)
  }
  return row
}

// ── Load a specific provider config (for test-send) ───────────────────────────
async function getProviderConfig(provider) {
  const result = await pool.query(
    'SELECT * FROM email_settings WHERE provider = $1 LIMIT 1',
    [provider]
  )
  return result.rows[0] || null
}

// ── Core send function ─────────────────────────────────────────────────────────
// opts: { to, subject, text, provider? }
//   provider — if supplied, forces that provider (for test-send route)
async function sendEmail({ to, subject, text, provider = null }) {
  const config = provider
    ? await getProviderConfig(provider)
    : await getActiveConfig()

  if (!config) {
    const err = new Error('No email provider is configured and active. Go to Superadmin > Email Settings and activate a provider.')
    console.error('[emailService] sendEmail FAILED:', err.message)
    throw err
  }

  console.log(`[emailService] Sending via ${config.provider} → ${to} | subject: "${subject}"`);

  if (config.provider === 'smtp') {
    const transporter = nodemailer.createTransport({
      host:   config.host,
      port:   parseInt(config.port || 587),
      secure: config.encryption === 'ssl',
      auth:   { user: config.username, pass: config.password },
      ...(config.encryption === 'tls' ? { requireTLS: true } : {}),
    })
    try {
      const info = await transporter.sendMail({
        from:    `"${config.from_name}" <${config.from_email}>`,
        to,
        subject,
        text,
      })
      console.log(`[emailService] SMTP sent OK → messageId: ${info.messageId}`)
    } catch (smtpErr) {
      console.error(`[emailService] SMTP FAILED → host:${config.host} port:${config.port} user:${config.username} from:${config.from_email}`)
      console.error('[emailService] SMTP error detail:', smtpErr)
      throw smtpErr
    }

  } else if (config.provider === 'resend') {
    if (!config.api_key) throw new Error('Resend API key is not configured')
    const resend = new Resend(config.api_key)
    try {
      const info = await resend.emails.send({
        from: `${config.from_name} <${config.from_email}>`,
        to,
        subject,
        text,
      })
      console.log(`[emailService] Resend sent OK → id: ${info?.data?.id || JSON.stringify(info)}`)
    } catch (resendErr) {
      console.error(`[emailService] Resend FAILED → from:${config.from_email}`)
      console.error('[emailService] Resend error detail:', resendErr)
      throw resendErr
    }

  } else {
    throw new Error(`Unknown provider: ${config.provider}`)
  }
}

// ── Send using a named DB template ────────────────────────────────────────────
// opts: { templateKey, to, vars }
async function sendTemplateEmail({ templateKey, to, vars = {} }) {
  const result = await pool.query(
    'SELECT subject, body FROM email_templates WHERE key = $1 LIMIT 1',
    [templateKey]
  )

  if (result.rows.length === 0) {
    // Fall back to hard-coded defaults if template not yet seeded
    const fallback = DEFAULT_TEMPLATES[templateKey]
    if (!fallback) throw new Error(`Email template "${templateKey}" not found`)
    const subject = fillTemplate(fallback.subject, vars)
    const text    = fillTemplate(fallback.body, vars)
    return sendEmail({ to, subject, text })
  }

  const tpl     = result.rows[0]
  const subject = fillTemplate(tpl.subject, vars)
  const text    = fillTemplate(tpl.body, vars)
  return sendEmail({ to, subject, text })
}

// ── Hard-coded fallback defaults (used if DB templates not seeded yet) ─────────
const DEFAULT_TEMPLATES = {
  signup_otp: {
    subject: 'Your SHNOOR HRMS Verification Code',
    body: `Hello,

Your email verification code is: {{otp}}

This code expires in 10 minutes. Do not share it with anyone.

If you did not request this, please ignore this email.

— SHNOOR HRMS Team`,
  },

  client_created: {
    subject: 'Welcome to SHNOOR HRMS — Your Account is Ready',
    body: `Hello {{contact_name}},

Your SHNOOR HRMS account has been created successfully.

Company : {{company_name}}
Email   : {{email}}
Password: {{password}}

Please log in at {{login_url}} and change your password immediately.

If you have any questions, contact SHNOOR support.

— SHNOOR HRMS Team`,
  },

  payment_verified: {
    subject: 'Payment Confirmed — SHNOOR HRMS Subscription Active',
    body: `Hello {{company_name}},

Your payment has been verified and your subscription is now active.

Plan     : {{plan}}
Amount   : ₹{{amount}}
Reference: {{reference}}
Date     : {{date}}

Thank you for choosing SHNOOR HRMS.

— SHNOOR HRMS Team`,
  },

  payment_rejected: {
    subject: 'Payment Could Not Be Verified — SHNOOR HRMS',
    body: `Hello {{company_name}},

Unfortunately we could not verify your recent payment.

Plan     : {{plan}}
Amount   : ₹{{amount}}
Reference: {{reference}}
Date     : {{date}}
Reason   : {{rejection_reason}}

Please contact SHNOOR support or resubmit your payment.

— SHNOOR HRMS Team`,
  },
}

// ── Diagnose email config — returns a plain object describing what's wrong ─────
async function diagnoseEmailConfig() {
  const result = await pool.query('SELECT * FROM email_settings ORDER BY id')
  const rows = result.rows

  if (rows.length === 0) {
    return { ok: false, issue: 'NO_ROWS', message: 'email_settings table is empty — no provider has been saved yet.' }
  }

  const active = rows.find(r => r.is_active)
  if (!active) {
    return {
      ok: false,
      issue: 'NONE_ACTIVE',
      message: 'Providers exist but none has is_active = true. Go to Email Settings and activate one.',
      providers: rows.map(r => ({ provider: r.provider, is_active: r.is_active }))
    }
  }

  const issues = []
  if (!active.from_email) issues.push('from_email is blank')
  if (!active.from_name)  issues.push('from_name is blank')

  if (active.provider === 'smtp') {
    if (!active.host)     issues.push('host is blank')
    if (!active.username) issues.push('username is blank')
    if (!active.password) issues.push('password is blank')
  }
  if (active.provider === 'resend') {
    if (!active.api_key) issues.push('api_key is blank')
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issue: 'INCOMPLETE_CONFIG',
      provider: active.provider,
      message: `Active provider "${active.provider}" is missing: ${issues.join(', ')}`,
      fields: issues
    }
  }

  return {
    ok: true,
    provider: active.provider,
    from: `${active.from_name} <${active.from_email}>`,
    message: `Config looks complete. If emails still fail, check your server logs for [emailService] lines.`
  }
}

module.exports = { sendEmail, sendTemplateEmail, fillTemplate, DEFAULT_TEMPLATES, diagnoseEmailConfig }