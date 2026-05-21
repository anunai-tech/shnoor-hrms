//  Runs on company-subdomain routes only (NOT on main site routes).
//  Reads req.hostname → extracts subdomain → finds company in DB
//  attaches req.company so controllers know which company this is.

const pool = require('../config/db')

const subdomainMiddleware = async (req, res, next) => {
  try {
    const hostname = req.hostname
    // Skip middleware for localhost, plain IPs, and non-shnoor hosts (Render, etc.)
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      !hostname.includes('.') ||
      !hostname.includes('.shnoor.')
    ) {
      req.company = null
      return next()
    }

    const parts = hostname.split('.')

    if (parts.length < 3) {
      req.company = null
      return next()
    }

    const subdomain = parts[0].toLowerCase()

    if (subdomain === 'superadmin') {
      req.company = null
      return next()
    }

    const result = await pool.query(
      `SELECT id, name, subdomain, status, client_id
       FROM companies
       WHERE subdomain = $1
       LIMIT 1`,
      [subdomain]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No company found for subdomain: ${subdomain}`
      })
    }

    const company = result.rows[0]

    if (company.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'This company account has been suspended. Please contact support.'
      })
    }

    if (company.status === 'pending') {
      return res.status(403).json({
        success: false,
        message: 'This company portal is not yet active. Subdomain approval is pending.'
      })
    }

    req.company = company
    next()

  } catch (err) {
    console.error('subdomainMiddleware error:', err)
    res.status(500).json({
      success: false,
      message: 'Internal server error in subdomain resolution'
    })
  }
}

module.exports = subdomainMiddleware