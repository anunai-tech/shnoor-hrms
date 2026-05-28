// Handles payment gateway config, invoice generation, and manual payment
// verification. All secrets stored AES-256-GCM encrypted. PDFs generated on demand.

const pool = require('../config/db')
const crypto = require('crypto')
const PDFDocument = require('pdfkit')

const ALGORITHM = 'aes-256-gcm'

const { encrypt, decrypt, generateInvoiceNumber, createInvoiceRecord } = require('../utils/paymentUtils')

const maskKey = (key) => key ? key.substring(0, 6) + '••••••••••••' : null

// Get all gateways — secrets never leave server, only masked public keys returned.
const getGateways = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, gateway_name, is_active, public_key, secret_key_encrypted, extra_config, updated_at FROM payment_gateways ORDER BY id'
    )
    const gateways = result.rows.map(g => ({
      id: g.id,
      gateway_name: g.gateway_name,
      is_active: g.is_active,
      public_key_masked: maskKey(g.public_key),
      has_secret: !!g.secret_key_encrypted,
      extra_config: g.extra_config || {},
      updated_at: g.updated_at,
    }))
    res.json({ success: true, data: gateways })
  } catch (err) {
    console.error('getGateways error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Update gateway — only encrypts new secret if a real value submitted, not empty or masked.
const updateGateway = async (req, res) => {
  try {
    const { gateway_name } = req.params
    const { is_active, public_key, secret_key, extra_config } = req.body

    const existing = await pool.query(
      'SELECT secret_key_encrypted FROM payment_gateways WHERE gateway_name = $1',
      [gateway_name]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Gateway not found' })
    }

    let secretEncrypted = existing.rows[0].secret_key_encrypted
    if (secret_key && secret_key.trim().length > 0 && !secret_key.includes('•')) {
      secretEncrypted = encrypt(secret_key.trim())
    }

    await pool.query(
      `UPDATE payment_gateways
       SET is_active = $1, public_key = $2, secret_key_encrypted = $3,
           extra_config = COALESCE($4, extra_config), updated_at = NOW()
       WHERE gateway_name = $5`,
      [is_active ?? false, public_key?.trim() || null, secretEncrypted,
      extra_config ? JSON.stringify(extra_config) : null, gateway_name]
    )
    res.json({ success: true, message: `${gateway_name} updated successfully` })
  } catch (err) {
    console.error('updateGateway error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get manual settings — account number returned masked (last 4 digits only).
const getManualSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM manual_payment_settings WHERE id = 1')
    const row = result.rows[0]
    if (!row) return res.json({ success: true, data: null })

    let maskedAccount = null
    if (row.bank_account_no) {
      try {
        const decrypted = decrypt(row.bank_account_no)
        maskedAccount = '••••••' + decrypted.slice(-4)
      } catch { maskedAccount = '••••••••' }
    }

    res.json({
      success: true,
      data: {
        upi_id: row.upi_id, upi_name: row.upi_name, upi_is_active: row.upi_is_active,
        bank_name: row.bank_name, bank_account_no_masked: maskedAccount,
        bank_ifsc: row.bank_ifsc, bank_holder: row.bank_holder,
        bank_is_active: row.bank_is_active, updated_at: row.updated_at,
      }
    })
  } catch (err) {
    console.error('getManualSettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Update manual settings — encrypts bank account number, preserves existing if masked sent back.
const updateManualSettings = async (req, res) => {
  try {
    const {
      upi_id, upi_name, upi_is_active,
      bank_name, bank_account_no, bank_ifsc, bank_holder, bank_is_active
    } = req.body

    let encryptedAccount = null
    const isNewAccount = bank_account_no &&
      bank_account_no.trim().length > 0 &&
      !bank_account_no.includes('•')

    if (isNewAccount) {
      encryptedAccount = encrypt(bank_account_no.trim())
    } else {
      const existing = await pool.query(
        'SELECT bank_account_no FROM manual_payment_settings WHERE id = 1'
      )
      encryptedAccount = existing.rows[0]?.bank_account_no || null
    }

    await pool.query(
      `UPDATE manual_payment_settings SET
        upi_id=$1, upi_name=$2, upi_is_active=$3,
        bank_name=$4, bank_account_no=$5, bank_ifsc=$6,
        bank_holder=$7, bank_is_active=$8, updated_at=NOW()
       WHERE id=1`,
      [upi_id || null, upi_name || null, upi_is_active ?? false,
      bank_name || null, encryptedAccount, bank_ifsc || null,
      bank_holder || null, bank_is_active ?? false]
    )
    res.json({ success: true, message: 'Manual payment settings updated successfully' })
  } catch (err) {
    console.error('updateManualSettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get all invoices — optional ?company_id and ?status query filters.
const getInvoices = async (req, res) => {
  try {
    const { company_id, status } = req.query
    const conditions = []
    const params = []

    if (company_id) {
      params.push(parseInt(company_id))
      conditions.push(`i.company_id = $${params.length}`)
    }
    if (status) {
      params.push(status)
      conditions.push(`i.status = $${params.length}`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT i.id, i.invoice_number, i.billing_type, i.base_amount, i.gst_rate,
              i.gst_amount, i.total_amount, i.currency, i.gateway_used,
              i.status, i.period_start, i.period_end, i.generated_at,
              c.name as company_name, s.name as plan_name
       FROM invoices i
       LEFT JOIN companies c ON i.company_id = c.id
       LEFT JOIN subscriptions s ON i.plan_id = s.id
       ${where}
       ORDER BY i.generated_at DESC`,
      params
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getInvoices error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Generate and stream an invoice PDF — no disk storage, built on demand.
const downloadInvoice = async (req, res) => {
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
       WHERE i.id = $1 LIMIT 1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found' })
    }

    const inv = result.rows[0]
    const curr = inv.currency === 'USD' ? 'USD ' : 'Rs.'

    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${inv.invoice_number}.pdf"`)
    doc.pipe(res)

    // Header bar
    doc.rect(0, 0, 595, 80).fill('#D97706')
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('SHNOOR HRMS', 50, 22)
    doc.fontSize(10).font('Helvetica').text('Human Resource Management System', 50, 50)
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
      .text('INVOICE', 400, 22, { align: 'right', width: 145 })
    doc.fontSize(10).font('Helvetica')
      .text(inv.invoice_number, 400, 48, { align: 'right', width: 145 })

    doc.moveTo(50, 100).lineTo(545, 100).strokeColor('#e2e8f0').lineWidth(1).stroke()

    // From section
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

    // Bill To section
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

    // Line items table header
    const tableTop = 275
    doc.rect(50, tableTop, 495, 28).fill('#f8fafc')
    doc.fillColor('#64748b').fontSize(9).font('Helvetica-Bold')
      .text('DESCRIPTION', 60, tableTop + 9)
      .text('BILLING', 310, tableTop + 9)
      .text('AMOUNT', 450, tableTop + 9, { width: 80, align: 'right' })

    // Line item row
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

    // Totals block
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
        .text(`Exchange rate at time of payment: 1 USD = ₹${inv.exchange_rate}`,
          360, totalsTop + 78)
    }

    // Payment details
    const payTop = totalsTop + 110
    doc.moveTo(50, payTop).lineTo(545, payTop).strokeColor('#e2e8f0').lineWidth(0.5).stroke()
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('PAYMENT METHOD', 50, payTop + 12)
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica')
      .text((inv.gateway_used || 'manual').toUpperCase(), 50, payTop + 25)
    doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold').text('STATUS', 200, payTop + 12)
    doc.fillColor('#16a34a').fontSize(9).font('Helvetica-Bold').text('PAID', 200, payTop + 25)

    // Footer
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
    console.error('downloadInvoice error:', err)
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF' })
    }
  }
}

// Get all pending manual payments awaiting superadmin verification.
const getPendingPayments = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.company_id, t.amount, t.plan, t.billing_type,
              t.gateway, t.gateway_order_id,t.screenshot_url, t.status, t.payment_date, t.created_at,
              c.name as company_name, c.email as company_email
       FROM transactions t
       LEFT JOIN companies c ON t.company_id = c.id
       WHERE t.status = 'Pending'
         AND t.gateway IN ('upi', 'netbanking')
       ORDER BY t.created_at DESC`
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getPendingPayments error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Verify manual payment — marks paid, creates subscription record, generates invoice.
// Uses DB transaction with row lock to prevent double verification.
const verifyManualPayment = async (req, res) => {
  const dbClient = await pool.connect()
  try {
    const { id } = req.params
    await dbClient.query('BEGIN')

    // Lock row — prevents race condition if superadmin double-clicks verify.
    const txResult = await dbClient.query(
      `SELECT t.* FROM transactions t
       WHERE t.id = $1 AND t.status = 'Pending' FOR UPDATE`,
      [id]
    )
    if (txResult.rows.length === 0) {
      await dbClient.query('ROLLBACK')
      return res.status(404).json({
        success: false,
        message: 'Pending payment not found or already processed'
      })
    }

    const tx = txResult.rows[0]

    // Look up plan by name stored in the transaction record.
    const planResult = await dbClient.query(
      'SELECT id FROM subscriptions WHERE name = $1 LIMIT 1',
      [tx.plan]
    )
    const planId = planResult.rows[0]?.id || null

    // Get GST rate and invoice prefix from website settings.
    const wsResult = await dbClient.query(
      'SELECT gst_rate, invoice_prefix FROM website_settings LIMIT 1'
    )
    const gstRate = parseFloat(wsResult.rows[0]?.gst_rate || 18)
    const invoicePrefix = wsResult.rows[0]?.invoice_prefix || 'SHNOOR-INV'

    // Mark transaction as paid.
    await dbClient.query(
      "UPDATE transactions SET status='Paid', payment_date=NOW() WHERE id=$1",
      [id]
    )

    // Calculate subscription period — monthly adds 1 month, yearly adds 1 year.
    const startDate = new Date()
    const endDate = new Date(startDate)
    if (tx.billing_type === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    // Expire existing active subscription for this company before creating new one.
    await dbClient.query(
      "UPDATE company_subscriptions SET status='expired' WHERE company_id=$1 AND status='active'",
      [tx.company_id]
    )

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

    // Back-calculate base amount from total (total already includes GST).
    const baseAmount = parseFloat((tx.amount / (1 + gstRate / 100)).toFixed(2))
    const invoiceNumber = await generateInvoiceNumber(dbClient, invoicePrefix)

    await createInvoiceRecord(dbClient, {
      invoiceNumber, companyId: tx.company_id, transactionId: tx.id,
      planId, billingType: tx.billing_type || 'monthly', baseAmount, gstRate,
      currency: tx.currency || 'INR', exchangeRate: tx.exchange_rate || 1,
      gatewayUsed: tx.gateway,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
    })

    await dbClient.query('COMMIT')
    res.json({ success: true, message: 'Payment verified and subscription activated' })
  } catch (err) {
    await dbClient.query('ROLLBACK')
    console.error('verifyManualPayment error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  } finally {
    dbClient.release()
  }
}

// Reject a pending manual payment — marks as failed, no subscription change.
const rejectManualPayment = async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const result = await pool.query(
      "UPDATE transactions SET status='Failed', rejection_reason=$1 WHERE id=$2 AND status='Pending' RETURNING id",
      [reason || null, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pending payment not found or already processed'
      })
    }
    res.json({ success: true, message: 'Payment rejected' })
  } catch (err) {
    console.error('rejectManualPayment error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getGateways, updateGateway, getManualSettings, updateManualSettings,
  getInvoices, downloadInvoice,
  getPendingPayments, verifyManualPayment, rejectManualPayment
}