
const useSubdomain = () => {
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return {
      subdomain: null,
      isSuperAdmin: false,
      isCompany: false,
      companySlug: null
    }
  }

  const parts = hostname.split('.')

  if (parts.length < 3) {
    return {
      subdomain: null,
      isSuperAdmin: false,
      isCompany: false,
      companySlug: null
    }
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