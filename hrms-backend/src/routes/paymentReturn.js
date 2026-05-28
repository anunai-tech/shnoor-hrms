// Public routes — no authentication middleware.
// Called by payment gateway servers after payment completion.
const express = require('express')
const router  = express.Router()
const {
  handlePayuReturn,
  handleCashfreeReturn,
  handlePaytmReturn
} = require('../controllers/paymentReturnController')

router.post('/payu',     handlePayuReturn)
router.get('/cashfree',  handleCashfreeReturn)
router.post('/paytm',    handlePaytmReturn)

module.exports = router