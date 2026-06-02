const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')

const {
  getGateways, updateGateway, getManualSettings, updateManualSettings,
  getInvoices, downloadInvoice,
  getPendingPayments, verifyManualPayment, rejectManualPayment
} = require('../controllers/paymentController')
const { getCompanies, createCompany, updateCompany, deleteCompany, suspendCompany } = require('../controllers/companyController')
const {
  getPlanFeatures, updatePlanFeature, getCompanyUsage, terminateCompanyPlan, togglePlanActive,
  getSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  getTransactions,
  getAdmins, getManagers, createAdmin, createManager, deleteUser, activateUser,
  getContactQueries, updateQueryStatus,
  getWebsiteSettings, updateWebsiteSettings,
  getProfile, updateProfile, changePassword,
  getClients, createClient, getCompanyManagers,
  getSubdomainRequests, approveSubdomainRequest, rejectSubdomainRequest
} = require('../controllers/superadminController')
const {
  getEmailSettings, updateEmailSettings,
  getSmtpSettings, updateSmtpSettings,
  getResendSettings, updateResendSettings,
  sendEmailSettingsOtp, verifyEmailSettingsOtp,
  testEmailSettings,
  getEmailTemplates, updateEmailTemplates,
  diagnoseEmail,
} = require('../controllers/emailSettingsController')

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
router.put('/subscriptions/:id/toggle-active', togglePlanActive)
router.get('/plan-features', getPlanFeatures)
router.put('/plan-features/:subscription_id/:feature_key', updatePlanFeature)
router.get('/companies/:id/usage', getCompanyUsage)
router.put('/companies/:id/terminate-plan', terminateCompanyPlan)
router.get('/companies/:id/managers', getCompanyManagers)

// Clients
router.get('/clients', getClients)
router.post('/clients', createClient)

// Payment Gateways — manual routes defined first to avoid conflict with /:gateway_name param.
router.get('/payment-gateways/manual', getManualSettings)
router.put('/payment-gateways/manual', updateManualSettings)
router.get('/payment-gateways', getGateways)
router.put('/payment-gateways/:gateway_name', updateGateway)

// Invoices — superadmin can list all invoices (?company_id filter) and download PDF.
router.get('/invoices', getInvoices)
router.get('/invoices/:id/download', downloadInvoice)

// Manual payment verification — list pending, verify or reject.
router.get('/pending-payments', getPendingPayments)
router.put('/pending-payments/:id/verify', verifyManualPayment)
router.put('/pending-payments/:id/reject', rejectManualPayment)

// Subdomain Requests
router.get('/subdomain-requests', getSubdomainRequests)
router.put('/subdomain-requests/:id/approve', approveSubdomainRequest)
router.put('/subdomain-requests/:id/reject', rejectSubdomainRequest)

// ── Email Settings & Templates ─────────────────────────────────────────────
// Specific sub-paths must be declared before the generic /email-settings routes.
router.get('/email-settings/diagnose',    diagnoseEmail)
router.post('/email-settings/send-otp',   sendEmailSettingsOtp)
router.post('/email-settings/verify-otp', verifyEmailSettingsOtp)
router.post('/email-settings/test',       testEmailSettings)
router.get('/email-settings/templates',   getEmailTemplates)
router.put('/email-settings/templates',   updateEmailTemplates)
// Per-provider routes (used by the frontend SMTP / Resend tabs)
router.get('/email-settings/smtp',        getSmtpSettings)
router.put('/email-settings/smtp',        updateSmtpSettings)
router.get('/email-settings/resend',      getResendSettings)
router.put('/email-settings/resend',      updateResendSettings)
// Generic routes (keep for backwards compat / other uses)
router.get('/email-settings',             getEmailSettings)
router.put('/email-settings',             updateEmailSettings)

module.exports = router