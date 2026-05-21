// Only recognizes *.shnoor.test (local dev) and *.shnoor.com (production)
// as subdomain-based routes. Everything else (localhost, onrender.com,
//vercel.app, etc.) is treated as the main site.

const useSubdomain = () => {
  const hostname = window.location.hostname

  // localhost / IP fallback
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { subdomain: null, isSuperAdmin: false, isCompany: false, companySlug: null }
  }

  // Only process actual shnoor domains — ignore onrender.com, vercel.app, etc.
  if (!hostname.includes('.shnoor.')) {
    return { subdomain: null, isSuperAdmin: false, isCompany: false, companySlug: null }
  }

  const parts = hostname.split('.')

  // Need subdomain.shnoor.tld = at least 3 parts
  if (parts.length < 3) {
    return { subdomain: null, isSuperAdmin: false, isCompany: false, companySlug: null }
  }

  const subdomain = parts[0].toLowerCase()
  const isSuperAdmin = subdomain === 'superadmin'
  const isCompany = !isSuperAdmin

  return {
    subdomain,
    isSuperAdmin,
    isCompany,
    companySlug: isCompany ? subdomain : null
  }
}

export default useSubdomain