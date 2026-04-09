const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const superadminRoutes = require('./routes/superadmin')
const managerRoutes = require('./routes/manager')
const employeeRoutes = require('./routes/employee')
const publicRoutes = require('./routes/public')

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/superadmin', superadminRoutes)
app.use('/api/v1/manager', managerRoutes)
app.use('/api/v1/employee', employeeRoutes)
app.use('/api/v1/public', publicRoutes)

app.get('/', (req, res) => {
  res.json({ success: true, message: 'SHNOOR HRMS API is running' })
})

module.exports = app