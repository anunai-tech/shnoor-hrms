const pool = require('../config/db')
const fs = require('fs')
const path = require('path')

const getProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id
    const result = await pool.query(
      'SELECT filename FROM profile_pictures WHERE user_id = $1',
      [userId]
    )
    if (result.rows.length === 0) {
      return res.json({ success: true, data: { url: null } })
    }
    const url = `/uploads/profile-pictures/${result.rows[0].filename}`
    return res.json({ success: true, data: { url } })
  } catch (err) {
    console.error('getProfilePicture error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// POST /api/v1/profile-picture
const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    // Delete old file from disk if one existed
    const existing = await pool.query(
      'SELECT filename FROM profile_pictures WHERE user_id = $1',
      [userId]
    )
    if (existing.rows.length > 0) {
      const oldPath = path.join(__dirname, '..', '..', 'uploads', 'profile-pictures', existing.rows[0].filename)
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
    }

    // Upsert new record
    await pool.query(
      `INSERT INTO profile_pictures (user_id, filename, original_name, mimetype, size)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
         SET filename = EXCLUDED.filename,
             original_name = EXCLUDED.original_name,
             mimetype = EXCLUDED.mimetype,
             size = EXCLUDED.size,
             uploaded_at = NOW()`,
      [userId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
    )

    const url = `/uploads/profile-pictures/${req.file.filename}`
    return res.json({ success: true, data: { url } })
  } catch (err) {
    console.error('uploadProfilePicture error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

// DELETE /api/v1/profile-picture
const deleteProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      'SELECT filename FROM profile_pictures WHERE user_id = $1',
      [userId]
    )
    if (result.rows.length === 0) {
      return res.json({ success: true, message: 'No picture to delete' })
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '..', '..', 'uploads', 'profile-pictures', result.rows[0].filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    await pool.query('DELETE FROM profile_pictures WHERE user_id = $1', [userId])

    return res.json({ success: true, message: 'Profile picture removed' })
  } catch (err) {
    console.error('deleteProfilePicture error:', err)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getProfilePicture, uploadProfilePicture, deleteProfilePicture }
