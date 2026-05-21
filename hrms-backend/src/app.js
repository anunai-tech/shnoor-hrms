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
const subdomainMiddleware = require('./middleware/subdomainMiddleware')

const app = express()

// Dynamic CORS — allows any *.shnoor.test (local) or *.shnoor.com (production)
const allowedOriginPattern = /^https?:\/\/([\w-]+\.)?shnoor\.(test|com)(:\d+)?$/

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true)

    if (allowedOriginPattern.test(origin) || origin === 'http://localhost:5173') {
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
app.use('/api/v1/public', publicRoutes)
app.use('/api/v1/profile-picture', profilePictureRoutes)

// Company subdomain routes — subdomain check runs first
app.use('/api/v1/manager', subdomainMiddleware, managerRoutes)
app.use('/api/v1/employee', subdomainMiddleware, employeeRoutes)
app.use('/api/v1/messages', subdomainMiddleware, messageRoutes)

app.get('/', (req, res) => {
  res.json({ success: true, message: 'SHNOOR HRMS API is running' })
})

module.exports = app