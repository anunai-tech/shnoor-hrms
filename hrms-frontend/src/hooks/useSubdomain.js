const useSubdomain = () => {
  const hostname = window.location.hostname
  const params = new URLSearchParams(window.location.search)
  const companyParam = params.get('company')

  // Helper to build return object
  const makeResult = (slug) => {
    if (!slug) return { subdomain: null, isSuperAdmin: false, isCompany: false, companySlug: null }
    const isSuperAdmin = slug === 'superadmin'
    return {
      subdomain: slug,
      isSuperAdmin,
      isCompany: !isSuperAdmin,
      companySlug: !isSuperAdmin ? slug : null
    }
  }

  // Real shnoor domain — use subdomain from hostname (highest priority)
  if (hostname.includes('.shnoor.')) {
    const parts = hostname.split('.')
    if (parts.length >= 3) {
      const slug = parts[0].toLowerCase()
      // persist to session so reloads work
      if (slug !== 'superadmin') sessionStorage.setItem('companySlug', slug)
      else sessionStorage.removeItem('companySlug')
      return makeResult(slug)
    }
  }

  // Non-shnoor host (localhost, onrender.com, etc.)
  // Priority: ?company= param > sessionStorage
  if (companyParam) {
    const slug = companyParam.toLowerCase()
    if (slug !== 'superadmin') sessionStorage.setItem('companySlug', slug)
    else sessionStorage.removeItem('companySlug')
    return makeResult(slug)
  }

  // sessionStorage fallback — survives React Router navigation + page reloads
  const stored = sessionStorage.getItem('companySlug')
  if (stored) return makeResult(stored)

  return makeResult(null)
}

export default useSubdomain