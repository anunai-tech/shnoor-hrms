const express = require('express')
const router = express.Router()
const { login, registerClient, superAdminLogin } = require('../controllers/authController')

router.post('/register', registerClient)
router.post('/login', login)
router.post('/sa-login', superAdminLogin)

module.exports = router