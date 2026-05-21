import api from './api'

// Companies
export const getCompanies = () => api.get('/superadmin/companies')
export const createCompany = (data) => api.post('/superadmin/companies', data)
export const updateCompany = (id, data) => api.put(`/superadmin/companies/${id}`, data)
export const deleteCompany = (id) => api.delete(`/superadmin/companies/${id}`)

// Subscriptions
export const getSubscriptions = () => api.get('/superadmin/subscriptions')
export const createSubscription = (data) => api.post('/superadmin/subscriptions', data)
export const updateSubscription = (id, data) => api.put(`/superadmin/subscriptions/${id}`, data)
export const deleteSubscription = (id) => api.delete(`/superadmin/subscriptions/${id}`)

// Transactions
export const getTransactions = () => api.get('/superadmin/transactions')

// Admin Management
export const getAdmins = () => api.get('/superadmin/admins')
export const getManagers = () => api.get('/superadmin/managers')
export const createAdmin = (data) => api.post('/superadmin/admins', data)
export const createManager = (data) => api.post('/superadmin/managers', data)
export const deleteUser = (id) => api.delete(`/superadmin/users/${id}`)
export const activateUser = (id) => api.put(`/superadmin/users/${id}/activate`)

// Contact Queries
export const getContactQueries = () => api.get('/superadmin/contact-queries')
export const updateQueryStatus = (id, status) => api.put(`/superadmin/contact-queries/${id}`, { status })

// Website Settings
export const getWebsiteSettings = () => api.get('/superadmin/website-settings')
export const updateWebsiteSettings = (data) => api.put('/superadmin/website-settings', data)

// Profile
export const getSuperAdminProfile = () => api.get('/superadmin/profile')
export const updateSuperAdminProfile = (data) => api.put('/superadmin/profile', data)
export const changePassword = (data) => api.put('/superadmin/change-password', data)

// Company actions
export const suspendCompany = (id, action) => api.put(`/superadmin/companies/${id}/suspend`, { action })
export const getCompanyManagers = (id) => api.get(`/superadmin/companies/${id}/managers`)

// Clients
export const getClients = () => api.get('/superadmin/clients')
export const createClient = (data) => api.post('/superadmin/clients', data)

// Subdomain Requests
export const getSubdomainRequests = () => api.get('/superadmin/subdomain-requests')
export const approveSubdomainRequest = (id) => api.put(`/superadmin/subdomain-requests/${id}/approve`)
export const rejectSubdomainRequest = (id, reason) => api.put(`/superadmin/subdomain-requests/${id}/reject`, { reason })