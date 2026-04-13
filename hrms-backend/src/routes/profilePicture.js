const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
const upload = require('../middleware/uploadMiddleware')
const { getProfilePicture, uploadProfilePicture, deleteProfilePicture } = require('../controllers/profilePictureController')

router.get('/', authenticate, getProfilePicture)
router.post('/', authenticate, upload.single('profilePicture'), uploadProfilePicture)
router.delete('/', authenticate, deleteProfilePicture)

module.exports = router
