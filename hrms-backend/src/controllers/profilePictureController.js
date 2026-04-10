
const pool = require('../config/db')
const fs = require('fs')
const path = require('path')

// ── Helper: build the public URL for a stored file path ───────────────────────
// file_path in DB  →  "uploads/profiles/42-1712345678901.jpg"
// Public URL       →  "http://localhost:5000/uploads/profiles/42-..."
const toPublicUrl = (req, filePath) => {
  if (!filePath) return null
  return `${req.protocol}://${req.get('host')}/${filePath.replace(/\\/g, '/')}`
}

// ── GET /profile-picture  (own picture) ───────────────────────────────────────
const getProfilePicture = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT file_path, mime_type, original_name FROM user_profile_pictures WHERE user_id = $1',
      [req.user.id]
    )
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null })
    }
    const row = result.rows[0]
    return res.json({
      success: true,
      data: {
        url: toPublicUrl(req, row.file_path),
        mime_type: row.mime_type,
        original_name: row.original_name
      }
    })
  } catch (err) {
    console.error('getProfilePicture error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── GET /profile-picture/:userId  (any user – manager/admin use) ──────────────
const getProfilePictureByUserId = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT file_path, mime_type FROM user_profile_pictures WHERE user_id = $1',
      [req.params.userId]
    )
    if (result.rows.length === 0) {
      return res.json({ success: true, data: null })
    }
    const row = result.rows[0]
    return res.json({
      success: true,
      data: { url: toPublicUrl(req, row.file_path), mime_type: row.mime_type }
    })
  } catch (err) {
    console.error('getProfilePictureByUserId error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── POST /profile-picture  (upload / replace) ─────────────────────────────────
// Expects multer to have already run (req.file is populated)
const uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    // Relative path to store in DB  (forward slashes, no leading slash)
    const filePath = `uploads/profiles/${req.file.filename}`

    // Check if there's an existing picture – delete the old file from disk
    const existing = await pool.query(
      'SELECT file_path FROM user_profile_pictures WHERE user_id = $1',
      [req.user.id]
    )
    if (existing.rows.length > 0) {
      const oldPath = path.join(__dirname, '../../', existing.rows[0].file_path)
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath)
      }
    }

    // Upsert: insert or update the single row for this user
    const result = await pool.query(
      `INSERT INTO user_profile_pictures (user_id, file_path, mime_type, original_name, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET file_path = EXCLUDED.file_path,
             mime_type = EXCLUDED.mime_type,
             original_name = EXCLUDED.original_name,
             updated_at = NOW()
       RETURNING file_path, mime_type`,
      [req.user.id, filePath, req.file.mimetype, req.file.originalname]
    )

    return res.status(201).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        url: toPublicUrl(req, result.rows[0].file_path),
        mime_type: result.rows[0].mime_type
      }
    })
  } catch (err) {
    console.error('uploadProfilePicture error:', err)
    // If DB fails, try to clean up the uploaded file
    if (req.file) {
      const p = path.join(__dirname, '../../uploads/profiles', req.file.filename)
      if (fs.existsSync(p)) fs.unlinkSync(p)
    }
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ── DELETE /profile-picture ───────────────────────────────────────────────────
const deleteProfilePicture = async (req, res) => {
  try {
    const existing = await pool.query(
      'SELECT file_path FROM user_profile_pictures WHERE user_id = $1',
      [req.user.id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No profile picture found' })
    }

    // Remove file from disk
    const oldPath = path.join(__dirname, '../../', existing.rows[0].file_path)
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)

    // Remove DB row
    await pool.query('DELETE FROM user_profile_pictures WHERE user_id = $1', [req.user.id])

    return res.json({ success: true, message: 'Profile picture removed' })
  } catch (err) {
    console.error('deleteProfilePicture error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getProfilePicture,
  getProfilePictureByUserId,
  uploadProfilePicture,
  deleteProfilePicture
}
