const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const {
  getDashboard,
  getCurrentPlan,
  getUsage,
  getSubdomainRequest,
  createSubdomainRequest,
  getBranding,
  updateBranding,
  changePassword,
  getTransactions,
  createSupportTicket,
  getManagers,
  createManager,
  toggleManager,
  getEmployees
} = require('../controllers/clientController')

router.use(authenticate)
router.use(authorize('client'))

router.get('/dashboard', getDashboard)
router.get('/plan', getCurrentPlan)
router.get('/usage', getUsage)
router.get('/subdomain-request', getSubdomainRequest)
router.post('/subdomain-request', createSubdomainRequest)
router.get('/branding', getBranding)
router.put('/branding', updateBranding)
router.put('/password', changePassword)
router.get('/transactions', getTransactions)
router.post('/support', createSupportTicket)
// Manager management
router.get('/managers', getManagers)
router.get('/employees', getEmployees)
router.post('/managers', createManager)
router.put('/managers/:id/toggle', toggleManager)

module.exports = router