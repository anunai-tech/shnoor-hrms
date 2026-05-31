const express = require('express')
const router  = express.Router()
const {
  login,
  registerClient,
  superAdminLogin,
  sendEmailOtp,
  verifyEmailOtp,
} = require('../controllers/authController')

// Self-registration OTP flow (new)
router.post('/send-email-otp',   sendEmailOtp)
router.post('/verify-email-otp', verifyEmailOtp)

// Main auth routes
router.post('/register', registerClient)
router.post('/login',    login)
router.post('/sa-login', superAdminLogin)

module.exports = router