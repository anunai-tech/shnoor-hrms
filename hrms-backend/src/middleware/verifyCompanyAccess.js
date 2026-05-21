
// Runs after authenticate + subdomainMiddleware on company subdomain routes.
// Ensures the logged-in user actually belongs to the company of this subdomain.

const verifyCompanyAccess = (req, res, next) => {
  // skip if no subdomain context (main site routes)
  if (!req.company) return next()

  // superadmin and client are never on company subdomains
  if (req.user.role === 'superadmin' || req.user.role === 'client') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Please use the main portal.'
    })
  }

  // core check — user's company must match subdomain's company
  if (req.user.company_id !== req.company.id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not belong to this company.'
    })
  }

  next()
}

module.exports = verifyCompanyAccess