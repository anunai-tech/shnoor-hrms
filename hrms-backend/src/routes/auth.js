const express = require('express')
const router = express.Router()
const { login, registerClient } = require('../controllers/authController')

router.post('/register', registerClient)
router.post('/login', login)

module.exports = router