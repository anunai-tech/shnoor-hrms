const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')

const { getCompanies, createCompany, updateCompany, deleteCompany } = require('../controllers/companyController')
const {
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  getTransactions,
  getAdmins, getManagers, createAdmin, createManager, deleteUser,
  getContactQueries, updateQueryStatus,
  getWebsiteSettings, updateWebsiteSettings,
  getProfile, updateProfile, changePassword
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

// Admin management
router.get('/admins', getAdmins)
router.get('/managers', getManagers)
router.post('/admins', createAdmin)
router.post('/managers', createManager)
router.delete('/users/:id', deleteUser)

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

module.exports = router