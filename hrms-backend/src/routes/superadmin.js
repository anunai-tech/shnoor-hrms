const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')

const { getCompanies, createCompany, updateCompany, deleteCompany, suspendCompany } = require('../controllers/companyController')
const {
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  getTransactions,
  getAdmins, getManagers, createAdmin, createManager, deleteUser, activateUser,
  getContactQueries, updateQueryStatus,
  getWebsiteSettings, updateWebsiteSettings,
  getProfile, updateProfile, changePassword,
  getClients, createClient, getCompanyManagers,
  getSubdomainRequests, approveSubdomainRequest, rejectSubdomainRequest
} = require('../controllers/superadminController')

router.use(authenticate)
router.use(authorize('superadmin'))

// Companies
router.get('/companies', getCompanies)
router.post('/companies', createCompany)
router.put('/companies/:id', updateCompany)
router.delete('/companies/:id', deleteCompany)

// Subscriptions
router.get('/subscriptions', getSubscriptions)
router.post('/subscriptions', createSubscription)
router.put('/subscriptions/:id', updateSubscription)
router.delete('/subscriptions/:id', deleteSubscription)

// Transactions
router.get('/transactions', getTransactions)

// Admin & manager management
router.get('/admins', getAdmins)
router.get('/managers', getManagers)
router.post('/admins', createAdmin)
router.post('/managers', createManager)
router.delete('/users/:id', deleteUser)
router.put('/users/:id/activate', activateUser)

// Contact queries
router.get('/contact-queries', getContactQueries)
router.put('/contact-queries/:id', updateQueryStatus)

// Website settings
router.get('/website-settings', getWebsiteSettings)
router.put('/website-settings', updateWebsiteSettings)

// Profile
router.get('/profile', getProfile)
router.put('/profile', updateProfile)
router.put('/change-password', changePassword)

// Company suspend/activate + managers view
router.put('/companies/:id/suspend', suspendCompany)
router.get('/companies/:id/managers', getCompanyManagers)

// Clients
router.get('/clients', getClients)
router.post('/clients', createClient)

// Subdomain Requests
router.get('/subdomain-requests', getSubdomainRequests)
router.put('/subdomain-requests/:id/approve', approveSubdomainRequest)
router.put('/subdomain-requests/:id/reject', rejectSubdomainRequest)

module.exports = router