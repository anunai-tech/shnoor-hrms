// Payment gateway return handlers — called by PayU (POST), Cashfree (GET), Paytm (POST).
// These endpoints are PUBLIC (no JWT) because gateway servers don't have our tokens.
// After verifying payment server-side, redirects to frontend with result params.

const pool = require('../config/db')
const crypto = require('crypto')
const { decrypt, generateInvoiceNumber, createInvoiceRecord } = require('../utils/paymentUtils')
const { sendTemplateEmail } = require('../utils/emailService')

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

// Shared helper 
// Called after a payment is confirmed — creates subscription + invoice.
// Returns { planName, amount, invoiceNumber, invoiceId, endDate }
const processVerifiedPayment = async (dbClient, tx) => {
  const wsResult = await dbClient.query(
    'SELECT gst_rate, invoice_prefix FROM website_settings LIMIT 1'
  )
  const gstRate    = parseFloat(wsResult.rows[0]?.gst_rate    || 18)
  const prefix     = wsResult.rows[0]?.invoice_prefix          || 'SHNOOR-INV'

  // Expire any existing active subscription for this company
  await dbClient.query(
    "UPDATE company_subscriptions SET status='expired' WHERE company_id=$1 AND status='active'",
    [tx.company_id]
  )

  // Calculate subscription period
  const startDate = new Date()
  const endDate   = new Date(startDate)
  if (tx.billing_type === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1)
  else                               endDate.setMonth(endDate.getMonth() + 1)

  // Look up plan by name (transactions store name, not id)
  const planResult = await dbClient.query(
    'SELECT id FROM subscriptions WHERE name = $1 LIMIT 1', [tx.plan]
  )
  const planId = planResult.rows[0]?.id || null

  await dbClient.query(
    `INSERT INTO company_subscriptions
     (company_id, subscription_id, billing_type, start_date, end_date, status)
     VALUES ($1,$2,$3,$4,$5,'active')`,
    [tx.company_id, planId, tx.billing_type || 'monthly', startDate, endDate]
  )

  if (planId) {
    await dbClient.query(
      'UPDATE companies SET subscription_id=$1 WHERE id=$2',
      [planId, tx.company_id]
    )
  }

  // Back-calculate base amount from total (total = base + GST)
  const baseAmount    = parseFloat((tx.amount / (1 + gstRate / 100)).toFixed(2))
  const invoiceNumber = await generateInvoiceNumber(dbClient, prefix)

  const invoiceRow = await createInvoiceRecord(dbClient, {
    invoiceNumber, companyId: tx.company_id, transactionId: tx.id,
    planId, billingType: tx.billing_type || 'monthly', baseAmount, gstRate,
    currency: tx.currency || 'INR', exchangeRate: tx.exchange_rate || 1,
    gatewayUsed: tx.gateway,
    periodStart: startDate.toISOString().split('T')[0],
    periodEnd:   endDate.toISOString().split('T')[0],
  })

  return {
    planName:      tx.plan,
    amount:        tx.amount,
    invoiceNumber,
    invoiceId:     invoiceRow.id,
    endDate:       endDate.toISOString().split('T')[0]
  }
}

// Redirect helper 
const successRedirect = (res, gateway, result) =>
  res.redirect(
    `${FRONTEND_URL}/client/billings` +
    `?payment_status=success` +
    `&gateway=${gateway}` +
    `&plan=${encodeURIComponent(result.planName)}` +
    `&amount=${result.amount}` +
    `&invoice=${encodeURIComponent(result.invoiceNumber)}` +
    `&invoice_id=${result.invoiceId}` +
    `&end_date=${result.endDate}`
  )

const failureRedirect = (res, gateway, reason) =>
  res.redirect(
    `${FRONTEND_URL}/client/billings` +
    `?payment_status=failed` +
    `&gateway=${gateway}` +
    `&reason=${encodeURIComponent(reason)}`
  )

// Send payment-verified email for online (automatic) gateway payments — non-blocking
const sendGatewayPaymentEmail = (companyId, tx, result) => {
  pool.query('SELECT name, email FROM companies WHERE id=$1', [companyId])
    .then(({ rows }) => {
      const company = rows[0]
      if (!company?.email) return
      return sendTemplateEmail({
        templateKey: 'payment_verified',
        to: company.email,
        vars: {
          company_name: company.name,
          amount:       parseFloat(tx.amount).toLocaleString('en-IN'),
          plan:         tx.plan || '',
          reference:    result.invoiceNumber,
          date:         new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        },
      })
    })
    .catch(err => console.error('Gateway payment email failed:', err.message))
}

// PayU Return 
// PayU POSTs to this endpoint after payment (both success and failure use same URL).
const handlePayuReturn = async (req, res) => {
  const dbClient = await pool.connect()
  try {
    const data = req.body
    const { status, txnid, amount, productinfo, firstname, email, hash } = data

    // Look up the pending transaction created when order was placed
    const txResult = await pool.query(
      `SELECT * FROM transactions
       WHERE gateway_order_id = $1 AND status = 'Pending' AND gateway = 'payu'`,
      [txnid]
    )

    if (!txResult.rows.length) {
      return failureRedirect(res, 'payu', 'Transaction not found')
    }
    const tx = txResult.rows[0]

    // Get PayU credentials for hash verification
    const gwResult = await pool.query(
      `SELECT public_key, secret_key_encrypted
       FROM payment_gateways WHERE gateway_name = 'payu'`
    )
    const key    = gwResult.rows[0].public_key
    const secret = decrypt(gwResult.rows[0].secret_key_encrypted)

    // PayU reverse hash format: secret|status|||||||||||email|firstname|productinfo|amount|txnid|key
    const hashStr      = `${secret}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`
    const expectedHash = crypto.createHash('sha512').update(hashStr).digest('hex')

    if (expectedHash !== hash) {
      await pool.query("UPDATE transactions SET status='Failed' WHERE id=$1", [tx.id])
      return failureRedirect(res, 'payu', 'Hash verification failed')
    }

    if (status !== 'success') {
      await pool.query("UPDATE transactions SET status='Failed' WHERE id=$1", [tx.id])
      return failureRedirect(res, 'payu', data.error_Message || 'Payment declined')
    }

    // Hash verified + status success → process payment
    await dbClient.query('BEGIN')
    await dbClient.query(
      `UPDATE transactions
       SET status='Paid', gateway_payment_id=$1, payment_date=NOW()
       WHERE id=$2`,
      [data.payuMoneyId || data.bank_ref_num || '', tx.id]
    )

    const result = await processVerifiedPayment(dbClient, tx)
    await dbClient.query('COMMIT')
    sendGatewayPaymentEmail(tx.company_id, tx, result)
    return successRedirect(res, 'payu', result)

  } catch (err) {
    await dbClient.query('ROLLBACK')
    console.error('handlePayuReturn error:', err)
    return failureRedirect(res, 'payu', 'Server error during verification')
  } finally {
    dbClient.release()
  }
}

// Cashfree Return 
// Cashfree GETs this endpoint after payment via the return_url set in order creation.
const handleCashfreeReturn = async (req, res) => {
  const dbClient = await pool.connect()
  try {
    const { order_id } = req.query

    if (!order_id) return failureRedirect(res, 'cashfree', 'Missing order ID')

    // Look up the pending transaction
    const txResult = await pool.query(
      `SELECT * FROM transactions
       WHERE gateway_order_id = $1 AND status = 'Pending' AND gateway = 'cashfree'`,
      [order_id]
    )

    if (!txResult.rows.length) {
      return failureRedirect(res, 'cashfree', 'Transaction not found')
    }
    const tx = txResult.rows[0]

    // Verify order status with Cashfree API
    const gwResult = await pool.query(
      `SELECT public_key, secret_key_encrypted, extra_config
       FROM payment_gateways WHERE gateway_name = 'cashfree'`
    )
    const gw          = gwResult.rows[0]
    const secret      = decrypt(gw.secret_key_encrypted)
    const extraConfig = gw.extra_config || {}
    const baseUrl     = extraConfig.environment === 'production'
      ? 'https://api.cashfree.com'
      : 'https://sandbox.cashfree.com'

    const cfRes  = await fetch(`${baseUrl}/pg/orders/${order_id}`, {
      headers: {
        'x-client-id':     gw.public_key,
        'x-client-secret': secret,
        'x-api-version':   '2023-08-01'
      }
    })
    const cfData = await cfRes.json()

    if (cfData.order_status !== 'PAID') {
      await pool.query("UPDATE transactions SET status='Failed' WHERE id=$1", [tx.id])
      return failureRedirect(res, 'cashfree', cfData.order_status || 'Payment not completed')
    }

    // Get Cashfree payment ID for record keeping
    const paymentsRes  = await fetch(`${baseUrl}/pg/orders/${order_id}/payments`, {
      headers: {
        'x-client-id':     gw.public_key,
        'x-client-secret': secret,
        'x-api-version':   '2023-08-01'
      }
    })
    const paymentsData = await paymentsRes.json()
    const cfPaymentId  = paymentsData[0]?.cf_payment_id || ''

    await dbClient.query('BEGIN')
    await dbClient.query(
      `UPDATE transactions
       SET status='Paid', gateway_payment_id=$1, payment_date=NOW()
       WHERE id=$2`,
      [cfPaymentId, tx.id]
    )

    const result = await processVerifiedPayment(dbClient, tx)
    await dbClient.query('COMMIT')
    sendGatewayPaymentEmail(tx.company_id, tx, result)
    return successRedirect(res, 'cashfree', result)

  } catch (err) {
    await dbClient.query('ROLLBACK')
    console.error('handleCashfreeReturn error:', err)
    return failureRedirect(res, 'cashfree', 'Server error during verification')
  } finally {
    dbClient.release()
  }
}

// Paytm Return (POST) 
// Paytm POSTs to this endpoint after payment.
// Note: Only used if Paytm CheckoutJS popup fails and falls back to redirect.
const handlePaytmReturn = async (req, res) => {
  const dbClient = await pool.connect()
  try {
    const body = req.body
    const { ORDERID, STATUS, TXNID, CHECKSUMHASH } = body

    const txResult = await pool.query(
      `SELECT * FROM transactions
       WHERE gateway_order_id = $1 AND status = 'Pending' AND gateway = 'paytm'`,
      [ORDERID]
    )

    if (!txResult.rows.length) {
      return failureRedirect(res, 'paytm', 'Transaction not found')
    }
    const tx = txResult.rows[0]

    const gwResult = await pool.query(
      `SELECT secret_key_encrypted FROM payment_gateways WHERE gateway_name = 'paytm'`
    )
    const secret = decrypt(gwResult.rows[0].secret_key_encrypted)

    // Verify Paytm checksum
    const paytmChecksum = require('paytmchecksum')
    const checksumBody  = { ...body }
    delete checksumBody.CHECKSUMHASH
    const isValid = paytmChecksum.verifySignature(checksumBody, secret, CHECKSUMHASH)

    if (!isValid) {
      await pool.query("UPDATE transactions SET status='Failed' WHERE id=$1", [tx.id])
      return failureRedirect(res, 'paytm', 'Checksum verification failed')
    }

    if (STATUS !== 'TXN_SUCCESS') {
      await pool.query("UPDATE transactions SET status='Failed' WHERE id=$1", [tx.id])
      return failureRedirect(res, 'paytm', body.RESPMSG || 'Payment failed')
    }

    await dbClient.query('BEGIN')
    await dbClient.query(
      `UPDATE transactions
       SET status='Paid', gateway_payment_id=$1, payment_date=NOW()
       WHERE id=$2`,
      [TXNID, tx.id]
    )

    const result = await processVerifiedPayment(dbClient, tx)
    await dbClient.query('COMMIT')
    sendGatewayPaymentEmail(tx.company_id, tx, result)
    return successRedirect(res, 'paytm', result)

  } catch (err) {
    await dbClient.query('ROLLBACK')
    console.error('handlePaytmReturn error:', err)
    return failureRedirect(res, 'paytm', 'Server error during verification')
  } finally {
    dbClient.release()
  }
}

module.exports = { handlePayuReturn, handleCashfreeReturn, handlePaytmReturn }