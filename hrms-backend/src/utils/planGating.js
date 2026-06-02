const pool = require('../config/db')

const getUsageCount = async (companyId, featureKey) => {
  switch (featureKey) {
    case 'employees': {
      const r = await pool.query(
        `SELECT COUNT(*) FROM users WHERE company_id=$1 AND is_active=true AND role IN ('employee','manager')`,
        [companyId]
      )
      return parseInt(r.rows[0].count)
    }
    case 'holidays': {
      const r = await pool.query('SELECT COUNT(*) FROM holidays WHERE company_id=$1', [companyId])
      return parseInt(r.rows[0].count)
    }
    case 'policies': {
      const r = await pool.query('SELECT COUNT(*) FROM company_policies WHERE company_id=$1', [companyId])
      return parseInt(r.rows[0].count)
    }
    case 'expenses': {
      const r = await pool.query(
        `SELECT COUNT(*) FROM expenses WHERE company_id=$1 AND created_at >= date_trunc('month', NOW())`,
        [companyId]
      )
      return parseInt(r.rows[0].count)
    }
    case 'salary_payslips': {
      const now = new Date()
      const r = await pool.query(
        'SELECT COUNT(*) FROM payslips WHERE company_id=$1 AND month=$2 AND year=$3',
        [companyId, now.getMonth() + 1, now.getFullYear()]
      )
      return parseInt(r.rows[0].count)
    }
    case 'letters': {
      const r = await pool.query(
        `SELECT COUNT(*) FROM letters WHERE company_id=$1 AND generated_at >= date_trunc('month', NOW())`,
        [companyId]
      )
      return parseInt(r.rows[0].count)
    }
    case 'messaging': {
      const r = await pool.query(
        `SELECT COUNT(*) FROM messages WHERE company_id=$1 AND created_at >= date_trunc('month', NOW())`,
        [companyId]
      )
      return parseInt(r.rows[0].count)
    }
    // Shifts limit = total active shifts for the company (not monthly, it's a total cap)
    case 'shifts': {
      const r = await pool.query(
        'SELECT COUNT(*) FROM shifts WHERE company_id=$1 AND is_active=true',
        [companyId]
      )
      return parseInt(r.rows[0].count)
    }
    default:
      return null
  }
}

// Core gate resolver — called by every gated controller
const checkFeatureAccess = async (companyId, featureKey) => {
  try {
    const compResult = await pool.query('SELECT subscription_id FROM companies WHERE id=$1', [companyId])
    if (!compResult.rows.length || !compResult.rows[0].subscription_id) {
      return { allowed: false, limit: null, currentUsage: 0, warning: false, remaining: 0, percentUsed: 0 }
    }
    const subscriptionId = compResult.rows[0].subscription_id
    const featResult = await pool.query(
      'SELECT is_enabled, monthly_limit FROM plan_features WHERE subscription_id=$1 AND feature_key=$2',
      [subscriptionId, featureKey]
    )
    if (!featResult.rows.length) {
      return { allowed: true, limit: null, currentUsage: 0, warning: false, remaining: null, percentUsed: 0 }
    }
    const { is_enabled, monthly_limit } = featResult.rows[0]
    if (!is_enabled) {
      return { allowed: false, limit: monthly_limit, currentUsage: 0, warning: false, remaining: 0, percentUsed: 0 }
    }
    if (!monthly_limit) {
      return { allowed: true, limit: null, currentUsage: null, warning: false, remaining: null, percentUsed: 0 }
    }
    const currentUsage = await getUsageCount(companyId, featureKey)
    const percentUsed = Math.round((currentUsage / monthly_limit) * 100)
    const warning = percentUsed >= 90
    const remaining = Math.max(0, monthly_limit - currentUsage)
    return { allowed: true, limit: monthly_limit, currentUsage, warning, remaining, percentUsed }
  } catch (err) {
    console.error(`checkFeatureAccess [${featureKey}]:`, err)
    return { allowed: true, limit: null, currentUsage: 0, warning: false, remaining: null, percentUsed: 0 }
  }
}

// Full plan feature snapshot — used by /plan-features endpoints and superadmin drawer
const getCompanyPlanFeatures = async (companyId) => {
  try {
    const compResult = await pool.query(
      `SELECT c.subscription_id, s.name as plan_name
       FROM companies c LEFT JOIN subscriptions s ON s.id=c.subscription_id WHERE c.id=$1`,
      [companyId]
    )
    if (!compResult.rows.length) return null
    const { subscription_id, plan_name } = compResult.rows[0]

    let featureRows = []
    if (subscription_id) {
      const r = await pool.query(
        'SELECT feature_key, is_enabled, monthly_limit FROM plan_features WHERE subscription_id=$1',
        [subscription_id]
      )
      featureRows = r.rows
    }

    const featureMap = {}
    for (const row of featureRows) featureMap[row.feature_key] = row

    const KEYS = ['employees','holidays','policies','expenses','salary_payslips','letters','offboarding','messaging','branding','shifts']
    const features = {}
    for (const key of KEYS) {
      const cfg = featureMap[key] || { is_enabled: true, monthly_limit: null }
      let used = null, percentUsed = 0, warning = false, remaining = null
      if (cfg.is_enabled && cfg.monthly_limit) {
        used = await getUsageCount(companyId, key)
        percentUsed = Math.round((used / cfg.monthly_limit) * 100)
        warning = percentUsed >= 90
        remaining = Math.max(0, cfg.monthly_limit - used)
      }
      features[key] = { enabled: cfg.is_enabled, limit: cfg.monthly_limit, used, remaining, warning, percent: percentUsed }
    }
    return { plan_name: plan_name || 'Basic', features }
  } catch (err) {
    console.error('getCompanyPlanFeatures:', err)
    return null
  }
}

module.exports = { checkFeatureAccess, getCompanyPlanFeatures }