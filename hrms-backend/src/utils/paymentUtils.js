// Shared payment utilities — encryption, invoice number generation, invoice record creation.
// Used by both paymentController (superadmin) and clientPaymentController (client).

const crypto = require('crypto')
const ALGORITHM = 'aes-256-gcm'

const getKey = () => {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) throw new Error('ENCRYPTION_KEY must be a 64-char hex string in .env')
  return Buffer.from(hex, 'hex')
}

const encrypt = (text) => {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

const decrypt = (stored) => {
  const key = getKey()
  const [ivHex, authTagHex, encHex] = stored.split(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final()
  ]).toString('utf8')
}

// Sequential invoice number from DB sequence — format SHNOOR-INV-2026-0042.
const generateInvoiceNumber = async (dbClient, prefix = 'SHNOOR-INV') => {
  const seq = await dbClient.query("SELECT nextval('invoice_number_seq') as num")
  const num = seq.rows[0].num.toString().padStart(4, '0')
  return `${prefix}-${new Date().getFullYear()}-${num}`
}

// Inserts a completed invoice row inside an existing DB transaction.
const createInvoiceRecord = async (dbClient, {
  invoiceNumber, companyId, transactionId, planId, billingType,
  baseAmount, gstRate, currency, exchangeRate, gatewayUsed, periodStart, periodEnd
}) => {
  const gstAmount = parseFloat((baseAmount * gstRate / 100).toFixed(2))
  const totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2))
  const result = await dbClient.query(
    `INSERT INTO invoices
     (invoice_number, company_id, transaction_id, plan_id, billing_type,
      base_amount, gst_rate, gst_amount, total_amount, currency, exchange_rate,
      gateway_used, status, period_start, period_end)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'paid',$13,$14)
     RETURNING *`,
    [
      invoiceNumber, companyId, transactionId, planId, billingType,
      baseAmount, gstRate, gstAmount, totalAmount,
      currency || 'INR', exchangeRate || 1,
      gatewayUsed, periodStart, periodEnd
    ]
  )
  return result.rows[0]
}

module.exports = { encrypt, decrypt, generateInvoiceNumber, createInvoiceRecord }