const express = require('express')
const router = express.Router()
const pool = require('../config/db')
const authenticate = require('../middleware/authenticate')

router.use(authenticate)

// Get unread message count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as unread_count FROM messages 
       WHERE receiver_id = $1 AND seen_status = false`,
      [req.user.id]
    )
    res.json({ success: true, data: { unread_count: parseInt(result.rows[0].unread_count) } })
  } catch (err) {
    res.json({ success: true, data: { unread_count: 0 } })
  }
})

// Get chat list
router.get('/chat-list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (u.id)
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.role,
        u.designation,
        u.email,
        m.message as last_message,
        m.created_at as last_message_at,
        m.sender_id,
        m.receiver_id,
        COUNT(m2.id) FILTER (WHERE m2.receiver_id = $1 AND m2.seen_status = false) as unread_count
       FROM users u
       JOIN messages m ON (
         (m.sender_id = $1 AND m.receiver_id = u.id) OR
         (m.sender_id = u.id AND m.receiver_id = $1)
       )
       LEFT JOIN messages m2 ON m2.sender_id = u.id AND m2.receiver_id = $1
       WHERE u.id != $1 AND u.company_id = $2
       GROUP BY u.id, u.first_name, u.last_name, u.role, u.designation, u.email,
                m.message, m.created_at, m.sender_id, m.receiver_id
       ORDER BY u.id, m.created_at DESC`,
      [req.user.id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Chat list error:', err)
    res.json({ success: true, data: [] })
  }
})

// Get predefined questions
router.get('/predefined-questions', async (req, res) => {
  res.json({ success: true, data: [] })
})

// Get conversation by userId query param
router.get('/conversation', async (req, res) => {
  try {
    const otherId = req.query.userId
    if (!otherId) return res.json({ success: true, data: { messages: [], counterpart: null } })

    const messagesResult = await pool.query(
      `SELECT m.*, u.first_name, u.last_name 
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id = $1 AND m.receiver_id = $2)
          OR (m.sender_id = $2 AND m.receiver_id = $1)
       ORDER BY m.created_at ASC`,
      [req.user.id, otherId]
    )

    const counterpartResult = await pool.query(
      `SELECT id, first_name, last_name, role, designation, email 
       FROM users WHERE id = $1`,
      [otherId]
    )

    res.json({
      success: true,
      data: {
        messages: messagesResult.rows,
        counterpart: counterpartResult.rows[0] || null
      }
    })
  } catch (err) {
    console.error('Get conversation error:', err)
    res.json({ success: true, data: { messages: [], counterpart: null } })
  }
})

// Mark conversation as seen
router.put('/seen', async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.json({ success: true })
    await pool.query(
      `UPDATE messages SET seen_status = true 
       WHERE sender_id = $1 AND receiver_id = $2 AND seen_status = false`,
      [userId, req.user.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.json({ success: true })
  }
})

// Edit a message
router.put('/:id', async (req, res) => {
  try {
    const { new_message } = req.body
    const result = await pool.query(
      `UPDATE messages SET message = $1, is_edited = true 
       WHERE id = $2 AND sender_id = $3 RETURNING *`,
      [new_message, req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

// Send a message
router.post('/', async (req, res) => {
  try {
    const { receiver_id, message, conversation_key } = req.body
    const convKey = conversation_key ||
      `${Math.min(req.user.id, receiver_id)}_${Math.max(req.user.id, receiver_id)}`
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, message, conversation_key, seen_status, company_id)
       VALUES ($1, $2, $3, $4, false, $5) RETURNING *`,
      [req.user.id, receiver_id, message, convKey, req.user.company_id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
})

module.exports = router