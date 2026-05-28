const pool = require('../config/db')
const crypto = require('crypto')
const PDFDocument = require('pdfkit')

const ALGORITHM = 'aes-256-gcm'

const { decrypt, generateInvoiceNumber, createInvoiceRecord } = require('../utils/paymentUtils')

// Returns active gateways without exposing any secrets.
const getActiveGateways = async (req, res) => {
  try {
    const gwResult = await pool.query(
      'SELECT gateway_name FROM payment_gateways WHERE is_active = true ORDER BY id'
    )
    const manualResult = await pool.query(
      'SELECT upi_is_active, bank_is_active FROM manual_payment_settings WHERE id = 1'
    )
    const m = manualResult.rows[0] || {}
    res.json({
      success: true,
      data: {
        automatic: gwResult.rows.map(g => g.gateway_name),
        upi: m.upi_is_active || false,
        netbanking: m.bank_is_active || false
      }
    })
  } catch (err) {
    console.error('getActiveGateways error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Returns UPI and bank details for display. Account number masked to last 4 digits.
const getManualPaymentDetails = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT upi_id, upi_name, bank_name, bank_account_no, bank_ifsc, bank_holder FROM manual_payment_settings WHERE id = 1'
    )
    if (!result.rows[0]) return res.json({ success: true, data: null })

    const row = result.rows[0]
    let maskedAccount = null
    if (row.bank_account_no) {
      try {
        const decrypted = decrypt(row.bank_account_no)
        maskedAccount = '••••••' + decrypted.slice(-4)
      } catch {
        maskedAccount = '••••••••'
      }
    }

    res.json({
      success: true,
      data: {
        upi_id: row.upi_id,
        upi_name: row.upi_name,
        bank_name: row.bank_name,
        bank_account_no_masked: maskedAccount,
        bank_ifsc: row.bank_ifsc,
        bank_holder: row.bank_holder
      }
    })
  } catch (err) {
    console.error('getManualPaymentDetails error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Creates a payment order with the chosen gateway. Price always fetched from DB.
const createOrder = async (req, res) => {
  try {
    const { plan_id, billing_type, gateway } = req.body
    const companyId = req.user.company_id

    if (!plan_id || !billing_type || !gateway) {
      return res.status(400).json({ success: false, message: 'plan_id, billing_type, and gateway are required' })
    }

    const planResult = await pool.query('SELECT * FROM subscriptions WHERE id = $1', [plan_id])
    if (!planResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Plan not found' })
    }
    const plan = planResult.rows[0]

    const baseAmount = billing_type === 'yearly'
      ? parseFloat(plan.annual_price)
      : parseFloat(plan.monthly_price)

    const wsResult = await pool.query('SELECT gst_rate FROM website_settings LIMIT 1')
    const gstRate = parseFloat(wsResult.rows[0]?.gst_rate || 18)
    const gstAmount = parseFloat((baseAmount * gstRate / 100).toFixed(2))
    const totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2))

    const gwResult = await pool.query(
      'SELECT public_key, secret_key_encrypted, extra_config FROM payment_gateways WHERE gateway_name = $1 AND is_active = true',
      [gateway]
    )
    if (!gwResult.rows.length) {
      return res.status(400).json({ success: false, message: `${gateway} is not active` })
    }
    const gw = gwResult.rows[0]
    const secret = decrypt(gw.secret_key_encrypted)

    if (gateway === 'razorpay') {
      const Razorpay = require('razorpay')
      const rzp = new Razorpay({ key_id: gw.public_key, key_secret: secret })
      const order = await rzp.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        receipt: `cmp_${companyId}_${Date.now()}`
      })
      return res.json({
        success: true,
        data: {
          order_id: order.id,
          amount: order.amount,
          currency: order.currency,
          key_id: gw.public_key,
          base_amount: baseAmount,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          gst_rate: gstRate,
          plan_name: plan.name
        }
      })
    }

    if (gateway === 'cashfree') {
      const extraConfig = gw.extra_config || {}
      const baseUrl   = extraConfig.environment === 'production'
        ? 'https://api.cashfree.com'
        : 'https://sandbox.cashfree.com'
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000'
      const orderId    = `ord_${companyId}_${Date.now()}`
      const returnUrl  = `${backendUrl}/api/v1/payment-return/cashfree?order_id=${orderId}`

      const cfRes  = await fetch(`${baseUrl}/pg/orders`, {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'x-client-id':     gw.public_key,
          'x-client-secret': secret,
          'x-api-version':   '2023-08-01'
        },
        body: JSON.stringify({
          order_id:     orderId,
          order_amount: totalAmount,
          order_currency: 'INR',
          order_meta:   { return_url: returnUrl },
          customer_details: {
            customer_id:    `cmp_${companyId}`,
            customer_email: req.user.email,
            customer_phone: '9999999999'
          }
        })
      })
      const cfData = await cfRes.json()
      if (!cfRes.ok) throw new Error(cfData.message || 'Cashfree order creation failed')

      // Create Pending transaction — return handler will update it to Paid after verification
      await pool.query(
        `INSERT INTO transactions
         (company_id, amount, plan, billing_type, type, gateway, gateway_order_id, status, currency, exchange_rate)
         VALUES ($1,$2,$3,$4,'subscription','cashfree',$5,'Pending','INR',1)`,
        [companyId, totalAmount, plan.name, billing_type, orderId]
      )

      return res.json({
        success: true,
        data: {
          order_id:          cfData.order_id,
          payment_session_id: cfData.payment_session_id,
          environment:       extraConfig.environment || 'sandbox',
          amount:            totalAmount,
          currency:          'INR',
          base_amount:       baseAmount,
          gst_amount:        gstAmount,
          total_amount:      totalAmount,
          gst_rate:          gstRate,
          plan_name:         plan.name
        }
      })
    }

    if (gateway === 'payu') {
      const backendUrl  = process.env.BACKEND_URL || 'http://localhost:5000'
      const txnId       = `PAYU_${companyId}_${Date.now()}`
      const firstName   = req.user.first_name || 'User'
      const surl        = `${backendUrl}/api/v1/payment-return/payu`
      const furl        = `${backendUrl}/api/v1/payment-return/payu`
      const hashString  = `${gw.public_key}|${txnId}|${totalAmount}|${plan.name}|${firstName}|${req.user.email}|||||||||||${secret}`
      const hash        = crypto.createHash('sha512').update(hashString).digest('hex')

      // Create Pending transaction — return handler will update to Paid after verification
      await pool.query(
        `INSERT INTO transactions
         (company_id, amount, plan, billing_type, type, gateway, gateway_order_id, status, currency, exchange_rate)
         VALUES ($1,$2,$3,$4,'subscription','payu',$5,'Pending','INR',1)`,
        [companyId, totalAmount, plan.name, billing_type, txnId]
      )

      return res.json({
        success: true,
        data: {
          txnid:       txnId,
          key:         gw.public_key,
          amount:      totalAmount,
          productinfo: plan.name,
          firstname:   firstName,
          email:       req.user.email,
          phone:       req.user.phone || '9999999999',
          hash,
          surl,
          furl,
          base_amount:  baseAmount,
          gst_amount:   gstAmount,
          total_amount: totalAmount,
          gst_rate:     gstRate,
          plan_name:    plan.name
        }
      })
    }

    if (gateway === 'paytm') {
      const paytmChecksum = require('paytmchecksum')
      const extraConfig   = gw.extra_config || {}
      const mid           = gw.public_key
      const orderId       = `PAYTM_${companyId}_${Date.now()}`
      const backendUrl    = process.env.BACKEND_URL || 'http://localhost:5000'
      const isProduction  = extraConfig.environment === 'production'
      const gatewayUrl    = isProduction
        ? 'https://securegw.paytm.in'
        : 'https://securegw-stage.paytm.in'
      const callbackUrl   = `${backendUrl}/api/v1/payment-return/paytm`

      const paytmParams = {
        body: {
          requestType: 'Payment',
          mid,
          websiteName: extraConfig.website || 'WEBSTAGING',
          orderId,
          callbackUrl,
          txnAmount:   { value: totalAmount.toString(), currency: 'INR' },
          userInfo:    { custId: `cmp_${companyId}` }
        }
      }

      const checksum = await paytmChecksum.generateSignatureByString(
        JSON.stringify(paytmParams.body), secret
      )
      paytmParams.head = { signature: checksum }

      const initRes  = await fetch(
        `${gatewayUrl}/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(paytmParams)
        }
      )
      const initData = await initRes.json()

      if (initData.body?.resultInfo?.resultStatus === 'F') {
        throw new Error(initData.body.resultInfo.resultMsg || 'Paytm initialization failed')
      }

      // Create Pending transaction for fallback redirect handler
      await pool.query(
        `INSERT INTO transactions
         (company_id, amount, plan, billing_type, type, gateway, gateway_order_id, status, currency, exchange_rate)
         VALUES ($1,$2,$3,$4,'subscription','paytm',$5,'Pending','INR',1)`,
        [companyId, totalAmount, plan.name, billing_type, orderId]
      )

      return res.json({
        success: true,
        data: {
          txn_token:    initData.body.txnToken,
          order_id:     orderId,
          mid,
          is_production: isProduction,
          gateway_url:  gatewayUrl,
          amount:       totalAmount,
          base_amount:  baseAmount,
          gst_amount:   gstAmount,
          total_amount: totalAmount,
          gst_rate:     gstRate,
          plan_name:    plan.name
        }
      })
    }

    if (gateway === 'paypal') {
      const extraConfig = gw.extra_config || {}
      const exchangeRate = parseFloat(extraConfig.usd_exchange_rate || 84)
      const usdAmount = parseFloat((totalAmount / exchangeRate).toFixed(2))

      const authRes = await fetch(
        `${extraConfig.environment === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${gw.public_key}:${secret}`).toString('base64')}`
          },
          body: 'grant_type=client_credentials'
        }
      )
      const authData = await authRes.json()

      const orderRes = await fetch(
        `${extraConfig.environment === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'}/v2/checkout/orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authData.access_token}`
          },
          body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
              amount: { currency_code: 'USD', value: usdAmount.toFixed(2) },
              description: `${plan.name} Plan - ${billing_type}`
            }]
          })
        }
      )
      const orderData = await orderRes.json()
      return res.json({
        success: true,
        data: {
          order_id: orderData.id,
          amount_usd: usdAmount,
          amount_inr: totalAmount,
          currency: 'USD',
          exchange_rate: exchangeRate,
          paypal_env: extraConfig.environment || 'sandbox',
          base_amount: baseAmount,
          gst_amount: gstAmount,
          total_amount: totalAmount,
          gst_rate: gstRate,
          plan_name: plan.name
        }
      })
    }

    return res.status(400).json({ success: false, message: 'Unsupported gateway' })
  } catch (err) {
    console.error('createOrder error:', err)
    res.status(500).json({ success: false, message: 'Failed to create order' })
  }
}

// Verifies payment signature server-side, then records transaction and generates invoice.
const verifyPayment = async (req, res) => {
  const dbClient = await pool.connect()
  try {
    const { gateway, order_id, payment_id, signature, plan_id, billing_type, exchange_rate } = req.body
    const companyId = req.user.company_id

    if (!gateway || !order_id || !plan_id || !billing_type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    const planResult = await pool.query('SELECT * FROM subscriptions WHERE id = $1', [plan_id])
    if (!planResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Plan not found' })
    }
    const plan = planResult.rows[0]

    const baseAmount = billing_type === 'yearly'
      ? parseFloat(plan.annual_price)
      : parseFloat(plan.monthly_price)

    const wsResult = await pool.query('SELECT gst_rate, invoice_prefix FROM website_settings LIMIT 1')
    const gstRate = parseFloat(wsResult.rows[0]?.gst_rate || 18)
    const invoicePrefix = wsResult.rows[0]?.invoice_prefix || 'SHNOOR-INV'
    const gstAmount = parseFloat((baseAmount * gstRate / 100).toFixed(2))
    const totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2))

    const gwResult = await pool.query(
      'SELECT secret_key_encrypted, extra_config FROM payment_gateways WHERE gateway_name = $1 AND is_active = true',
      [gateway]
    )
    if (!gwResult.rows.length) {
      return res.status(400).json({ success: false, message: `${gateway} gateway not active` })
    }
    const secret = decrypt(gwResult.rows[0].secret_key_encrypted)

    // Signature verification per gateway
    if (gateway === 'razorpay') {
      const expected = crypto.createHmac('sha256', secret)
        .update(`${order_id}|${payment_id}`)
        .digest('hex')
      if (expected !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' })
      }
    } else if (gateway === 'cashfree') {
      const expected = crypto.createHmac('sha256', secret)
        .update(`${order_id}${payment_id}`)
        .digest('base64')
      if (expected !== signature) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' })
      }
    } else if (gateway === 'payu') {
      const reverseHash = `${secret}|${signature.split('|').reverse().join('|')}`
      const expected = crypto.createHash('sha512').update(reverseHash).digest('hex')
      if (expected !== payment_id) {
        return res.status(400).json({ success: false, message: 'Invalid payment signature' })
      }

      } else if (gateway === 'paytm') {
      const paytmChecksum = require('paytmchecksum')
      const extraConfig   = gwResult.rows[0].extra_config || {}
      const isProduction  = extraConfig.environment === 'production'
      const gatewayUrl    = isProduction ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in'

      const gwFull2 = await pool.query(
        'SELECT public_key FROM payment_gateways WHERE gateway_name = $1', [gateway]
      )
      const mid = gwFull2.rows[0].public_key

      const statusBody = { body: { mid, orderId: order_id } }
      const chk = await paytmChecksum.generateSignatureByString(
        JSON.stringify(statusBody.body), secret
      )
      statusBody.head = { signature: chk }

      const statusRes  = await fetch(`${gatewayUrl}/v3/order/status`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(statusBody)
      })
      const statusData = await statusRes.json()

      if (statusData.body?.resultInfo?.resultStatus !== 'TXN_SUCCESS') {
        return res.status(400).json({
          success: false,
          message: statusData.body?.resultInfo?.resultMsg || 'Paytm payment not successful'
        })
      }

    } else if (gateway === 'paypal') {
      // PayPal capture verification happens via API call
      const extraConfig = gwResult.rows[0].extra_config || {}
      const baseUrl = extraConfig.environment === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com'

      const gwFull = await pool.query(
        'SELECT public_key FROM payment_gateways WHERE gateway_name = $1',
        [gateway]
      )
      const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${gwFull.rows[0].public_key}:${secret}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
      })
      const authData = await authRes.json()
      const captureRes = await fetch(`${baseUrl}/v2/checkout/orders/${order_id}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.access_token}`
        }
      })
      const captureData = await captureRes.json()
      if (captureData.status !== 'COMPLETED') {
        return res.status(400).json({ success: false, message: 'PayPal capture failed' })
      }
    }

    await dbClient.query('BEGIN')

    const currency = gateway === 'paypal' ? 'USD' : 'INR'
    const exchRate = gateway === 'paypal' ? parseFloat(exchange_rate || 84) : 1

    const txResult = await dbClient.query(
      `INSERT INTO transactions
       (company_id, amount, plan, billing_type, type, gateway, gateway_order_id,
        gateway_payment_id, status, currency, exchange_rate, payment_date)
       VALUES ($1,$2,$3,$4,'subscription',$5,$6,$7,'Paid',$8,$9,NOW())
       RETURNING id`,
      [companyId, totalAmount, plan.name, billing_type, gateway, order_id, payment_id, currency, exchRate]
    )
    const transactionId = txResult.rows[0].id

    const startDate = new Date()
    const endDate = new Date(startDate)
    if (billing_type === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    await dbClient.query(
      "UPDATE company_subscriptions SET status='expired' WHERE company_id=$1 AND status='active'",
      [companyId]
    )

    await dbClient.query(
      `INSERT INTO company_subscriptions
       (company_id, subscription_id, billing_type, start_date, end_date, status)
       VALUES ($1,$2,$3,$4,$5,'active')`,
      [companyId, plan_id, billing_type, startDate, endDate]
    )

    await dbClient.query(
      'UPDATE companies SET subscription_id=$1 WHERE id=$2',
      [plan_id, companyId]
    )

    const invoiceNumber = await generateInvoiceNumber(dbClient, invoicePrefix)
    await createInvoiceRecord(dbClient, {
      invoiceNumber, companyId, transactionId, planId: plan_id, billingType: billing_type,
      baseAmount, gstRate, currency, exchangeRate: exchRate, gatewayUsed: gateway,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0]
    })

    await dbClient.query('COMMIT')
    res.json({
      success: true,
      message: 'Payment verified and subscription activated',
      data: {
        plan_name:      plan.name,
        amount:         totalAmount,
        invoice_number: invoiceNumber,
        invoice_id:     (await pool.query(
          'SELECT id FROM invoices WHERE invoice_number=$1 LIMIT 1', [invoiceNumber]
        )).rows[0]?.id,
        billing_type,
        end_date:       endDate.toISOString().split('T')[0]
      }
    })
  } catch (err) {
    await dbClient.query('ROLLBACK')
    console.error('verifyPayment error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  } finally {
    dbClient.release()
  }
}

// Creates a pending transaction for UPI or netbanking and returns payment details.
const initiateManualPayment = async (req, res) => {
  try {
    const { plan_id, billing_type, gateway } = req.body
    const companyId = req.user.company_id

    if (!plan_id || !billing_type || !gateway) {
      return res.status(400).json({ success: false, message: 'plan_id, billing_type, and gateway are required' })
    }
    if (!['upi', 'netbanking'].includes(gateway)) {
      return res.status(400).json({ success: false, message: 'gateway must be upi or netbanking' })
    }

    const planResult = await pool.query('SELECT * FROM subscriptions WHERE id = $1', [plan_id])
    if (!planResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Plan not found' })
    }
    const plan = planResult.rows[0]

    const baseAmount = billing_type === 'yearly'
      ? parseFloat(plan.annual_price)
      : parseFloat(plan.monthly_price)

    const wsResult = await pool.query('SELECT gst_rate FROM website_settings LIMIT 1')
    const gstRate = parseFloat(wsResult.rows[0]?.gst_rate || 18)
    const gstAmount = parseFloat((baseAmount * gstRate / 100).toFixed(2))
    const totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2))

    const reference = `REF-${companyId}-${Date.now()}`

    const txResult = await pool.query(
      `INSERT INTO transactions
       (company_id, amount, plan, billing_type, type, gateway, gateway_order_id, status, currency, exchange_rate)
       VALUES ($1,$2,$3,$4,'subscription',$5,$6,'Pending','INR',1)
       RETURNING id`,
      [companyId, totalAmount, plan.name, billing_type, gateway, reference]
    )

    const manualResult = await pool.query(
      'SELECT upi_id, upi_name, bank_name, bank_account_no, bank_ifsc, bank_holder FROM manual_payment_settings WHERE id = 1'
    )
    const m = manualResult.rows[0]

    if (gateway === 'upi') {
      if (!m?.upi_id) {
        return res.status(400).json({ success: false, message: 'UPI not configured' })
      }
      const qrData = `upi://pay?pa=${m.upi_id}&pn=${encodeURIComponent(m.upi_name || 'SHNOOR')}&am=${totalAmount}&tn=${reference}&cu=INR`
      return res.json({
        success: true,
        data: {
          transaction_id: txResult.rows[0].id,
          reference,
          amount: totalAmount,
          base_amount: baseAmount,
          gst_amount: gstAmount,
          gst_rate: gstRate,
          upi_id: m.upi_id,
          upi_name: m.upi_name,
          qr_data: qrData
        }
      })
    }

    // netbanking
    let maskedAccount = '••••••••'
    if (m?.bank_account_no) {
      try {
        const decrypted = decrypt(m.bank_account_no)
        maskedAccount = '••••••' + decrypted.slice(-4)
      } catch { /* keep masked fallback */ }
    }

    return res.json({
      success: true,
      data: {
        transaction_id: txResult.rows[0].id,
        reference,
        amount: totalAmount,
        base_amount: baseAmount,
        gst_amount: gstAmount,
        gst_rate: gstRate,
        bank_name: m?.bank_name,
        bank_account_no_masked: maskedAccount,
        bank_ifsc: m?.bank_ifsc,
        bank_holder: m?.bank_holder
      }
    })
  } catch (err) {
    console.error('initiateManualPayment error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Returns invoices for this company only — ordered newest first.
const getClientInvoices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.invoice_number, i.billing_type, i.base_amount, i.gst_rate,
              i.gst_amount, i.total_amount, i.currency, i.gateway_used,
              i.status, i.period_start, i.period_end, i.generated_at,
              s.name as plan_name
       FROM invoices i
       LEFT JOIN subscriptions s ON i.plan_id = s.id
       WHERE i.company_id = $1
       ORDER BY i.generated_at DESC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getClientInvoices error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Generates and streams a PDF invoice — only for invoices belonging to this company.
const downloadClientInvoice = async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT i.*, c.name as company_name, c.email as company_email,
              s.name as plan_name,
              ws.invoice_company_name, ws.invoice_address, ws.invoice_rep_office,
              ws.invoice_email, ws.invoice_phone, ws.invoice_website,
              ws.invoice_gstin, ws.invoice_prefix
       FROM invoices i
       LEFT JOIN companies c ON i.company_id = c.id
       LEFT JOIN subscriptions s ON i.plan_id = s.id
       LEFT JOIN website_settings ws ON true
       WHERE i.id = $1 AND i.company_id = $2
       LIMIT 1`,
      [id, req.user.company_id]
    )

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found' })
    }

    const inv = result.rows[0]
    const curr = inv.currency === 'USD' ? 'USD ' : 'Rs.'

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${inv.invoice_number}.pdf"`)
    doc.pipe(res)

    doc.rect(0, 0, 595, 80).fill('#D97706')
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('SHNOOR HRMS', 50, 22)
    doc.fontSize(10).font('Helvetica').text('Human Resource Management System', 50, 50)
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
      .text('INVOICE', 400, 22, { align: 'right', width: 145 })
    doc.fontSize(10).font('Helvetica')
      .text(inv.invoice_number, 400, 48, { align: 'right', width: 145 })

    doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#e2e8f0').lineWidth(1).stroke()

    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('FROM', 50, 115)
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
      .text(inv.invoice_company_name || 'SHNOOR International LLC', 50, 130)
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
      .text(inv.invoice_address || '', 50, 145, { width: 240 })
    doc.text(inv.invoice_email || '', 50, 195, { width: 230 })
    doc.text(inv.invoice_phone || '', 50, 210, { width: 230 })
    doc.text(inv.invoice_website || '', 50, 225, { width: 230 })
    if (inv.invoice_gstin) {
      doc.text(`GSTIN: ${inv.invoice_gstin}`, 50, 240, { width: 230 })
    }

    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('BILL TO', 320, 115)
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica-Bold')
      .text(inv.company_name || '', 320, 130)
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
      .text(inv.company_email || '', 320, 145)

    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('INVOICE DATE', 320, 175)
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
      .text(new Date(inv.generated_at).toLocaleDateString('en-GB',
        { day: 'numeric', month: 'long', year: 'numeric' }), 320, 188)

    if (inv.period_start && inv.period_end) {
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('SERVICE PERIOD', 320, 210)
      doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
        .text(
          `${new Date(inv.period_start).toLocaleDateString('en-GB')} — ${new Date(inv.period_end).toLocaleDateString('en-GB')}`,
          320, 223
        )
    }

    const tableTop = 275
    doc.rect(50, tableTop, 495, 28).fill('#f8fafc')
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
      .text('DESCRIPTION', 60, tableTop + 9)
      .text('BILLING', 310, tableTop + 9)
      .text('AMOUNT', 450, tableTop + 9, { width: 80, align: 'right' })

    const row1 = tableTop + 28
    doc.moveTo(50, row1).lineTo(545, row1).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
      .text(`${inv.plan_name || 'Subscription'} Plan`, 60, row1 + 10)
      .text(inv.billing_type
        ? inv.billing_type.charAt(0).toUpperCase() + inv.billing_type.slice(1)
        : '', 310, row1 + 10)
      .text(
        `${curr}${parseFloat(inv.base_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        450, row1 + 10, { width: 80, align: 'right' }
      )

    const totalsTop = row1 + 55
    doc.moveTo(350, totalsTop).lineTo(545, totalsTop).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    doc.fillColor('#64748b').fontSize(9).font('Helvetica')
      .text('Subtotal', 360, totalsTop + 10)
      .text(
        `${curr}${parseFloat(inv.base_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        450, totalsTop + 10, { width: 80, align: 'right' }
      )
    doc.text(`GST (${parseFloat(inv.gst_rate)}%)`, 360, totalsTop + 28)
      .text(
        `${curr}${parseFloat(inv.gst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        450, totalsTop + 28, { width: 80, align: 'right' }
      )

    doc.moveTo(350, totalsTop + 46).lineTo(545, totalsTop + 46)
      .strokeColor('#D97706').lineWidth(1).stroke()
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold')
      .text('TOTAL', 360, totalsTop + 55)
    doc.fillColor('#D97706').fontSize(13).font('Helvetica-Bold')
      .text(
        `${curr}${parseFloat(inv.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        450, totalsTop + 53, { width: 80, align: 'right' }
      )

    if (inv.currency === 'USD' && parseFloat(inv.exchange_rate) !== 1) {
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
        .text(`Exchange rate at time of payment: 1 USD = ₹${inv.exchange_rate}`, 360, totalsTop + 78)
    }

    const payTop = totalsTop + 110
    doc.moveTo(50, payTop).lineTo(545, payTop).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('PAYMENT METHOD', 50, payTop + 12)
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
      .text((inv.gateway_used || 'manual').toUpperCase(), 50, payTop + 25)
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('STATUS', 200, payTop + 12)
    doc.fillColor('#16a34a').fontSize(9).font('Helvetica-Bold').text('PAID', 200, payTop + 25)

    doc.rect(0, 748, 595, 88).fill('#f8fafc')
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
      .text(
        'This is a system-generated invoice. For queries contact support@shnoor.com',
        50, 764, { align: 'center', width: 495 }
      )
      .text(
        `© ${new Date().getFullYear()} SHNOOR International LLC. All rights reserved.`,
        50, 779, { align: 'center', width: 495 }
      )

    doc.end()
  } catch (err) {
    console.error('downloadClientInvoice error:', err)
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF' })
    }
  }
}

// Stores base64 screenshot on a pending transaction belonging to this company.
const uploadPaymentScreenshot = async (req, res) => {
  try {
    const { transaction_id, screenshot_url } = req.body
    if (!transaction_id || !screenshot_url) {
      return res.status(400).json({ success: false, message: 'transaction_id and screenshot_url required' })
    }
    const result = await pool.query(
      `UPDATE transactions SET screenshot_url = $1
       WHERE id = $2 AND company_id = $3 AND status = 'Pending'
       RETURNING id`,
      [screenshot_url, transaction_id, req.user.company_id]
    )
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Transaction not found or not pending' })
    }
    res.json({ success: true, message: 'Screenshot uploaded' })
  } catch (err) {
    console.error('uploadPaymentScreenshot error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Returns PayPal public client_id — safe to expose to frontend for SDK initialization
const getPaypalConfig = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT public_key, extra_config
       FROM payment_gateways WHERE gateway_name = 'paypal' AND is_active = true LIMIT 1`
    )
    if (!result.rows.length) {
      return res.json({ success: false, message: 'PayPal not configured' })
    }
    const extraConfig = result.rows[0].extra_config || {}
    res.json({
      success: true,
      data: {
        client_id:   result.rows[0].public_key,
        environment: extraConfig.environment || 'sandbox'
      }
    })
  } catch (err) {
    console.error('getPaypalConfig error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getActiveGateways,
  getManualPaymentDetails,
  createOrder,
  verifyPayment,
  initiateManualPayment,
  getClientInvoices,
  downloadClientInvoice,
  uploadPaymentScreenshot,
  getPaypalConfig
}