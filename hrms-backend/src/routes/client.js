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
const {
  getActiveGateways,
  getManualPaymentDetails,
  createOrder,
  verifyPayment,
  initiateManualPayment,
  getClientInvoices,
  downloadClientInvoice,
  uploadPaymentScreenshot
} = require('../controllers/clientPaymentController')

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
router.get('/managers', getManagers)
router.get('/employees', getEmployees)
router.post('/managers', createManager)
router.put('/managers/:id/toggle', toggleManager)

router.get('/payment/gateways', getActiveGateways)
router.get('/payment/manual-details', getManualPaymentDetails)
router.post('/payment/create-order', createOrder)
router.post('/payment/verify', verifyPayment)
router.post('/payment/manual/initiate', initiateManualPayment)
router.post('/payment/screenshot', uploadPaymentScreenshot)
router.get('/invoices', getClientInvoices)
router.get('/invoices/:id/download', downloadClientInvoice)

module.exports = router