// src/middleware/upload.js
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'profiles')
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${req.user.id}-${Date.now()}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only image files are allowed'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
})

// Safe wrapper — catches multer errors and returns clean JSON instead of crashing Express 5
const uploadSingle = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (!err) return next()
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be smaller than 5 MB'
        : 'Only image files are allowed (jpg, png, webp, gif)'
      return res.status(400).json({ success: false, message: msg })
    }
    return res.status(400).json({ success: false, message: err.message })
  })
}

module.exports = { upload, uploadSingle }
