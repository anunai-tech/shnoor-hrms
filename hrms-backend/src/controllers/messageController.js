const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const pool = require('../config/db')

const MESSAGE_UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'messages')
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024

const QUICK_QUESTIONS = [
  { id: 'leave-status', text: 'How do I apply for a leave?' },
  { id: 'attendance-help', text: 'What are the company working hours?' },
  { id: 'salary-query', text: 'When is the salary credited?' },
  { id: 'document-request', text: 'How can I contact HR directly?' },
  { id: 'policy-help', text: 'Where can I find the holiday calendar?' }
]

const BOT_AUTO_REPLIES = {
  'How do I apply for a leave?': 'You can apply for a leave by navigating to the "Leaves" section in your sidebar and clicking the "Apply Leave" button.',
  'What are the company working hours?': 'Our standard company working hours are 9:00 AM to 6:00 PM, Monday through Friday.',
  'When is the salary credited?': 'Salary is typically credited on the last working day of every month.',
  'How can I contact HR directly?': 'You can contact HR directly at hr@shnoorintl.com or call the main office line.',
  'Where can I find the holiday calendar?': 'The holiday calendar is available in the "Holidays" tab on your dashboard.'
}

const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
  'image/gif': '.gif', 'image/webp': '.webp', 'application/pdf': '.pdf',
  'text/plain': '.txt', 'text/csv': '.csv', 'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/zip': '.zip', 'application/x-zip-compressed': '.zip'
}

const buildConversationKey = (firstUserId, secondUserId) => {
  const [a, b] = [Number(firstUserId), Number(secondUserId)].sort((x, y) => x - y)
  return `${a}_${b}`
}

const sanitizeFileName = (value) => {
  return (value || 'attachment').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').slice(0, 60) || 'attachment'
}

const parseDataUrl = (content) => {
  if (typeof content !== 'string') return null
  const match = content.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null
  return { mimeType: match[1], base64Payload: match[2] }
}

const inferExtension = (fileName, mimeType) => {
  const ext = path.extname(fileName || '')
  if (ext) return ext
  return MIME_EXTENSION_MAP[mimeType] || ''
}

const ensureMessageUploadDir = async () => {
  await fs.promises.mkdir(MESSAGE_UPLOAD_DIR, { recursive: true })
}

const saveAttachment = async (attachment) => {
  if (!attachment?.content) return { file_url: null, file_name: null, file_type: null }

  const parsed = parseDataUrl(attachment.content)
  if (!parsed) {
    const err = new Error('Attachment must be a valid base64 data URL')
    err.statusCode = 400
    throw err
  }

  const buffer = Buffer.from(parsed.base64Payload, 'base64')
  if (!buffer.length) {
    const err = new Error('Attachment is empty')
    err.statusCode = 400
    throw err
  }
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    const err = new Error('Attachment must be 5 MB or smaller')
    err.statusCode = 400
    throw err
  }

  await ensureMessageUploadDir()
  const originalName = attachment.name || 'attachment'
  const safeBase = sanitizeFileName(path.parse(originalName).name)
  const ext = inferExtension(originalName, attachment.type || parsed.mimeType)
  const storedName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeBase}${ext}`
  await fs.promises.writeFile(path.join(MESSAGE_UPLOAD_DIR, storedName), buffer)

  return {
    file_url: `/uploads/messages/${storedName}`,
    file_name: originalName,
    file_type: attachment.type || parsed.mimeType
  }
}

// Get the primary manager for an employee in a company
const getPrimaryManagerForEmployee = async (companyId, employeeId) => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, role, department, designation, profile_photo
     FROM users
     WHERE company_id = $1 AND role = 'manager' AND is_active = true AND id <> $2
     ORDER BY created_at ASC, id ASC
     LIMIT 1`,
    [companyId, employeeId]
  )
  return result.rows[0] || null
}

// Get any active company member by id (used for employee-to-anyone messaging)
const getCompanyMemberById = async (companyId, memberId, currentUserId) => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, role, department, designation, profile_photo
     FROM users
     WHERE id = $1 AND company_id = $2 AND is_active = true AND id <> $3
     LIMIT 1`,
    [memberId, companyId, currentUserId]
  )
  return result.rows[0] || null
}

const getEmployeeById = async (companyId, employeeId) => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, role, department, designation, profile_photo
     FROM users
     WHERE id = $1 AND company_id = $2 AND role = 'employee'
     LIMIT 1`,
    [employeeId, companyId]
  )
  return result.rows[0] || null
}

// Resolve who the current user is trying to chat with
const resolveConversationUser = async (req, requestedUserId) => {
  if (req.user.role === 'employee') {
    // Employee can message any active company member — manager or another employee
    if (requestedUserId) {
      const member = await getCompanyMemberById(req.user.company_id, requestedUserId, req.user.id)
      if (member) return member
    }
    // Fall back to primary manager if no specific user requested
    const primary = await getPrimaryManagerForEmployee(req.user.company_id, req.user.id)
    if (!primary) {
      const err = new Error('No active members found to chat with')
      err.statusCode = 404
      throw err
    }
    return primary
  }

  // Manager must specify an employee id
  if (!requestedUserId) {
    const err = new Error('Employee id is required')
    err.statusCode = 400
    throw err
  }

  const employee = await getEmployeeById(req.user.company_id, requestedUserId)
  if (!employee) {
    const err = new Error('Employee not found')
    err.statusCode = 404
    throw err
  }
  return employee
}

const fetchConversationMessages = async (companyId, conversationKey) => {
  const result = await pool.query(
    `SELECT m.id, m.sender_id, m.receiver_id, m.message, m.file_url, m.file_name, m.file_type,
            m.created_at, m.seen_status, m.is_edited,
            sender.first_name AS sender_first_name,
            sender.last_name AS sender_last_name
     FROM messages m
     LEFT JOIN users sender ON sender.id = m.sender_id
     WHERE m.company_id = $1 AND m.conversation_key = $2
     ORDER BY m.created_at ASC, m.id ASC`,
    [companyId, conversationKey]
  )
  return result.rows
}

const getChatList = async (req, res) => {
  try {
    const userId = req.user.id
    const companyId = req.user.company_id

    if (req.user.role === 'employee') {
      // Employee sees ALL active company members (manager + other employees) except themselves
      const result = await pool.query(
        `SELECT
           u.id AS user_id,
           u.first_name,
           u.last_name,
           u.email,
           u.role,
           u.department,
           u.designation,
           u.profile_photo,
           lm.message AS last_message,
           lm.file_name AS last_file_name,
           lm.file_type AS last_file_type,
           lm.created_at AS last_message_at,
           lm.sender_id AS last_sender_id,
           COALESCE(uc.unread_count, 0) AS unread_count
         FROM users u
         LEFT JOIN LATERAL (
           SELECT m.message, m.file_name, m.file_type, m.created_at, m.sender_id
           FROM messages m
           WHERE m.company_id = $1
             AND m.conversation_key = CASE
               WHEN u.id < $2 THEN CONCAT(u.id, '_', $2)
               ELSE CONCAT($2, '_', u.id)
             END
           ORDER BY m.created_at DESC, m.id DESC
           LIMIT 1
         ) lm ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS unread_count
           FROM messages m
           WHERE m.company_id = $1
             AND m.sender_id = u.id
             AND m.receiver_id = $2
             AND m.seen_status = false
         ) uc ON true
         WHERE u.company_id = $1 AND u.is_active = true AND u.id <> $2
         ORDER BY COALESCE(lm.created_at, u.created_at) DESC, u.role DESC, u.first_name ASC`,
        [companyId, userId]
      )
      return res.json({ success: true, data: result.rows })
    }

    // Manager sees ALL active employees in their company
    const result = await pool.query(
      `SELECT
         u.id AS user_id,
         u.first_name,
         u.last_name,
         u.email,
         u.role,
         u.department,
         u.designation,
         u.profile_photo,
         lm.message AS last_message,
         lm.file_name AS last_file_name,
         lm.file_type AS last_file_type,
         lm.created_at AS last_message_at,
         lm.sender_id AS last_sender_id,
         COALESCE(uc.unread_count, 0) AS unread_count
       FROM users u
       LEFT JOIN LATERAL (
         SELECT m.message, m.file_name, m.file_type, m.created_at, m.sender_id
         FROM messages m
         WHERE m.company_id = $1
           AND m.conversation_key = CASE
             WHEN u.id < $2 THEN CONCAT(u.id, '_', $2)
             ELSE CONCAT($2, '_', u.id)
           END
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 1
       ) lm ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS unread_count
         FROM messages m
         WHERE m.company_id = $1
           AND m.sender_id = u.id
           AND m.receiver_id = $2
           AND m.seen_status = false
       ) uc ON true
       WHERE u.company_id = $1 AND u.role = 'employee' AND u.is_active = true
       ORDER BY COALESCE(lm.created_at, u.created_at) DESC, u.first_name ASC`,
      [companyId, userId]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('Get chat list error:', err)
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
  }
}

const getConversation = async (req, res) => {
  try {
    const conversationUser = await resolveConversationUser(req, req.query.userId)
    const conversationKey = buildConversationKey(req.user.id, conversationUser.id)
    const messages = await fetchConversationMessages(req.user.company_id, conversationKey)

    res.json({
      success: true,
      data: { counterpart: conversationUser, conversation_key: conversationKey, messages }
    })
  } catch (err) {
    console.error('Get conversation error:', err)
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
  }
}

const sendMessage = async (req, res) => {
  try {
    const { receiver_id, message, attachment } = req.body
    const receiver = await resolveConversationUser(req, receiver_id)
    const trimmed = typeof message === 'string' ? message.trim() : ''

    if (!trimmed && !attachment?.content) {
      return res.status(400).json({ success: false, message: 'Message or attachment is required' })
    }

    const attachmentData = await saveAttachment(attachment)
    const conversationKey = buildConversationKey(req.user.id, receiver.id)

    const result = await pool.query(
      `INSERT INTO messages (company_id, conversation_key, sender_id, receiver_id, message, file_url, file_name, file_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, company_id, conversation_key, sender_id, receiver_id, message, file_url, file_name, file_type, created_at, seen_status`,
      [req.user.company_id, conversationKey, req.user.id, receiver.id, trimmed || null,
       attachmentData.file_url, attachmentData.file_name, attachmentData.file_type]
    )

    // Auto-reply only triggers when an employee sends a predefined quick question to the manager
    if (trimmed && req.user.role === 'employee' && receiver.role === 'manager') {
      const autoReply = BOT_AUTO_REPLIES[trimmed]
      if (autoReply) {
        await pool.query(
          `INSERT INTO messages (company_id, conversation_key, sender_id, receiver_id, message)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.user.company_id, conversationKey, receiver.id, req.user.id, autoReply]
        )
      }
    }

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        receiver: { id: receiver.id, first_name: receiver.first_name, last_name: receiver.last_name, email: receiver.email }
      }
    })
  } catch (err) {
    console.error('Send message error:', err)
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
  }
}

const markConversationSeen = async (req, res) => {
  try {
    const conversationUser = await resolveConversationUser(req, req.body.userId)
    const result = await pool.query(
      `UPDATE messages SET seen_status = true
       WHERE company_id = $1 AND sender_id = $2 AND receiver_id = $3 AND seen_status = false
       RETURNING id`,
      [req.user.company_id, conversationUser.id, req.user.id]
    )
    res.json({ success: true, data: { updated_count: result.rowCount } })
  } catch (err) {
    console.error('Mark seen error:', err)
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server error' })
  }
}

const getUnreadMessageCount = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM messages
       WHERE company_id = $1 AND receiver_id = $2 AND seen_status = false`,
      [req.user.company_id, req.user.id]
    )
    res.json({ success: true, data: { unread_count: result.rows[0]?.unread_count || 0 } })
  } catch (err) {
    console.error('Unread count error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getPredefinedQuestions = async (req, res) => {
  res.json({ success: true, data: QUICK_QUESTIONS })
}

const editMessage = async (req, res) => {
  try {
    const trimmed = typeof req.body.new_message === 'string' ? req.body.new_message.trim() : ''
    if (!trimmed) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' })
    }
    const result = await pool.query(
      `UPDATE messages SET message = $1, is_edited = true
       WHERE id = $2 AND sender_id = $3 AND company_id = $4
       RETURNING id, sender_id, receiver_id, message, file_url, file_name, file_type, created_at, seen_status, is_edited`,
      [trimmed, req.params.id, req.user.id, req.user.company_id]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Message not found or you are not the sender' })
    }
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('Edit message error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getChatList, getConversation, sendMessage, editMessage,
  markConversationSeen, getUnreadMessageCount, getPredefinedQuestions
}