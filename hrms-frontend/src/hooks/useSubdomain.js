// Two modes:
// 1. Production with real domain: reads subdomain from hostname (*.shnoor.com)
// 2. Render/localhost testing: reads ?company=slug query parameter
 

const useSubdomain = () => {
  const hostname = window.location.hostname
  const params = new URLSearchParams(window.location.search)
  const companyParam = params.get('company')

  // localhost dev — use ?company=slug param if present
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    if (companyParam) {
      const slug = companyParam.toLowerCase()
      const isSuperAdmin = slug === 'superadmin'
      return {
        subdomain: slug,
        isSuperAdmin,
        isCompany: !isSuperAdmin,
        companySlug: !isSuperAdmin ? slug : null
      }
    }
    return { subdomain: null, isSuperAdmin: false, isCompany: false, companySlug: null }
  }

  // Render or other non-shnoor hosts — use ?company=slug param
  if (!hostname.includes('.shnoor.')) {
    if (companyParam) {
      const slug = companyParam.toLowerCase()
      const isSuperAdmin = slug === 'superadmin'
      return {
        subdomain: slug,
        isSuperAdmin,
        isCompany: !isSuperAdmin,
        companySlug: !isSuperAdmin ? slug : null
      }
    }
    return { subdomain: null, isSuperAdmin: false, isCompany: false, companySlug: null }
  }

  // Real shnoor domain — use subdomain from hostname
  const parts = hostname.split('.')
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