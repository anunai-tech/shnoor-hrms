const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const superadminRoutes = require('./routes/superadmin')
const managerRoutes = require('./routes/manager')
const employeeRoutes = require('./routes/employee')
const messageRoutes = require('./routes/messages')
const publicRoutes = require('./routes/public')
const profilePictureRoutes = require('./routes/profilePicture')
const clientRoutes = require('./routes/client')
const paymentReturnRoutes = require('./routes/paymentReturn')
const subdomainMiddleware = require('./middleware/subdomainMiddleware')
const verifyCompanyAccess = require('./middleware/verifyCompanyAccess')

const app = express()

// Dynamic CORS — allows any *.shnoor.test (local) or *.shnoor.com (production)
const allowedOriginPattern = /^https?:\/\/([\w-]+\.)?shnoor\.(test|com)(:\d+)?$/

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)

    const renderFrontend = process.env.FRONTEND_URL || ''
    if (
      allowedOriginPattern.test(origin) ||
      origin === 'http://localhost:5173' ||
      origin === renderFrontend ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.payu.in') ||
      origin.endsWith('.cashfree.com') ||
      origin.endsWith('.paytm.in') ||
      origin.endsWith('.ngrok-free.app') ||
      origin.endsWith('.ngrok-free.dev')
    ) {
      callback(null, true)
    } else {
      callback(new Error(`CORS blocked: ${origin}`))
    }
  },
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// Main site routes — no subdomain check
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/superadmin', superadminRoutes)
app.use('/api/v1/client', clientRoutes)
// Payment return routes — called by gateway servers (PayU, Cashfree, Paytm)
// Must bypass CORS — these are server-to-server POST/GET requests, not browser requests
app.use('/api/v1/payment-return', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
}, paymentReturnRoutes)
app.use('/api/v1/public', publicRoutes)
app.use('/api/v1/profile-picture', profilePictureRoutes)

// Company subdomain routes — subdomain resolved, then company access verified per request
app.use('/api/v1/manager', subdomainMiddleware, verifyCompanyAccess, managerRoutes)
app.use('/api/v1/employee', subdomainMiddleware, verifyCompanyAccess, employeeRoutes)
app.use('/api/v1/messages', subdomainMiddleware, verifyCompanyAccess, messageRoutes)

app.get('/', (req, res) => {
  res.json({ success: true, message: 'SHNOOR HRMS API is running' })
})

module.exports = app