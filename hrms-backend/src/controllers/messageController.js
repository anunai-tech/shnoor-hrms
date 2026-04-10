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
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/csv': '.csv',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/zip': '.zip',
  'application/x-zip-compressed': '.zip'
}

const buildConversationKey = (firstUserId, secondUserId) => {
  const [smallerUserId, largerUserId] = [Number(firstUserId), Number(secondUserId)].sort((a, b) => a - b)
  return `${smallerUserId}:${largerUserId}`
}

const sanitizeFileName = (value) => {
  return (value || 'attachment')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60) || 'attachment'
}

const parseDataUrl = (content) => {
  if (typeof content !== 'string') return null
  const match = content.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null
  return {
    mimeType: match[1],
    base64Payload: match[2]
  }
}

const inferExtension = (fileName, mimeType) => {
  const explicitExtension = path.extname(fileName || '')
  if (explicitExtension) return explicitExtension
  return MIME_EXTENSION_MAP[mimeType] || ''
}

const ensureMessageUploadDir = async () => {
  await fs.promises.mkdir(MESSAGE_UPLOAD_DIR, { recursive: true })
}

const saveAttachment = async (attachment) => {
  if (!attachment?.content) {
    return { file_url: null, file_name: null, file_type: null }
  }

  const parsedContent = parseDataUrl(attachment.content)
  if (!parsedContent) {
    const error = new Error('Attachment content must be a valid base64 data URL')
    error.statusCode = 400
    throw error
  }

  const fileBuffer = Buffer.from(parsedContent.base64Payload, 'base64')
  if (!fileBuffer.length) {
    const error = new Error('Attachment is empty')
    error.statusCode = 400
    throw error
  }

  if (fileBuffer.length > MAX_ATTACHMENT_BYTES) {
    const error = new Error('Attachment must be 5 MB or smaller')
    error.statusCode = 400
    throw error
  }

  await ensureMessageUploadDir()

  const originalName = attachment.name || 'attachment'
  const safeBaseName = sanitizeFileName(path.parse(originalName).name)
  const fileExtension = inferExtension(originalName, attachment.type || parsedContent.mimeType)
  const storedFileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeBaseName}${fileExtension}`
  const targetPath = path.join(MESSAGE_UPLOAD_DIR, storedFileName)

  await fs.promises.writeFile(targetPath, fileBuffer)

  return {
    file_url: `/uploads/messages/${storedFileName}`,
    file_name: originalName,
    file_type: attachment.type || parsedContent.mimeType
  }
}

const getPrimaryManagerForEmployee = async (companyId, employeeId) => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, role, department, designation
     FROM users
     WHERE company_id = $1 AND role = 'manager' AND is_active = true AND id <> $2
     ORDER BY created_at ASC, id ASC
     LIMIT 1`,
    [companyId, employeeId]
  )

  return result.rows[0] || null
}

const getManagerById = async (companyId, managerId, currentUserId) => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, role, department, designation
     FROM users
     WHERE id = $1 AND company_id = $2 AND role = 'manager' AND is_active = true AND id <> $3
     LIMIT 1`,
    [managerId, companyId, currentUserId]
  )

  return result.rows[0] || null
}

const getEmployeeById = async (companyId, employeeId) => {
  const result = await pool.query(
    `SELECT id, first_name, last_name, email, role, department, designation
     FROM users
     WHERE id = $1 AND company_id = $2 AND role = 'employee'
     LIMIT 1`,
    [employeeId, companyId]
  )

  return result.rows[0] || null
}

const resolveConversationUser = async (req, requestedUserId) => {
  if (req.user.role === 'employee') {
    if (requestedUserId) {
      const explicitManager = await getManagerById(req.user.company_id, requestedUserId, req.user.id)
      if (explicitManager) return explicitManager
    }

    const primaryManager = await getPrimaryManagerForEmployee(req.user.company_id, req.user.id)
    if (!primaryManager) {
      const error = new Error('No active manager found for this employee')
      error.statusCode = 404
      throw error
    }
    return primaryManager
  }

  if (!requestedUserId) {
    const error = new Error('Employee id is required')
    error.statusCode = 400
    throw error
  }

  const employee = await getEmployeeById(req.user.company_id, requestedUserId)
  if (!employee) {
    const error = new Error('Employee not found')
    error.statusCode = 404
    throw error
  }

  return employee
}

const fetchConversationMessages = async (companyId, conversationKey) => {
  const result = await pool.query(
    `SELECT m.id, m.sender_id, m.receiver_id, m.message, m.file_url, m.file_name, m.file_type,
            m.created_at, m.seen_status,
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
    if (req.user.role === 'employee') {
      const manager = await getPrimaryManagerForEmployee(req.user.company_id, req.user.id)
      if (!manager) {
        return res.json({ success: true, data: [] })
      }

      const conversationKey = buildConversationKey(req.user.id, manager.id)
      const [lastMessageResult, unreadCountResult] = await Promise.all([
        pool.query(
          `SELECT message, file_url, file_name, file_type, created_at, sender_id
           FROM messages
           WHERE company_id = $1 AND conversation_key = $2
           ORDER BY created_at DESC, id DESC
           LIMIT 1`,
          [req.user.company_id, conversationKey]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS unread_count
           FROM messages
           WHERE company_id = $1 AND sender_id = $2 AND receiver_id = $3 AND seen_status = false`,
          [req.user.company_id, manager.id, req.user.id]
        )
      ])

      const lastMessage = lastMessageResult.rows[0] || null
      const unreadCount = unreadCountResult.rows[0]?.unread_count || 0

      return res.json({
        success: true,
        data: [{
          user_id: manager.id,
          first_name: manager.first_name,
          last_name: manager.last_name,
          email: manager.email,
          role: manager.role,
          department: manager.department,
          designation: manager.designation,
          conversation_key: conversationKey,
          last_message: lastMessage?.message || null,
          last_file_name: lastMessage?.file_name || null,
          last_file_type: lastMessage?.file_type || null,
          last_message_at: lastMessage?.created_at || null,
          last_sender_id: lastMessage?.sender_id || null,
          unread_count: unreadCount
        }]
      })
    }

    const result = await pool.query(
      `SELECT u.id AS user_id, u.first_name, u.last_name, u.email, u.role, u.department, u.designation,
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
             WHEN u.id < $2 THEN CONCAT(u.id, ':', $2)
             ELSE CONCAT($2, ':', u.id)
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
       WHERE u.company_id = $1 AND u.role = 'employee'
       ORDER BY COALESCE(lm.created_at, u.created_at) DESC, u.first_name ASC, u.last_name ASC`,
      [req.user.company_id, req.user.id]
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
      data: {
        counterpart: conversationUser,
        conversation_key: conversationKey,
        messages
      }
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
    const trimmedMessage = typeof message === 'string' ? message.trim() : ''

    if (!trimmedMessage && !attachment?.content) {
      return res.status(400).json({ success: false, message: 'Message or attachment is required' })
    }

    const attachmentData = await saveAttachment(attachment)
    const conversationKey = buildConversationKey(req.user.id, receiver.id)
    const result = await pool.query(
      `INSERT INTO messages (
         company_id, conversation_key, sender_id, receiver_id, message, file_url, file_name, file_type
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, company_id, conversation_key, sender_id, receiver_id, message, file_url, file_name, file_type, created_at, seen_status`,
      [
        req.user.company_id,
        conversationKey,
        req.user.id,
        receiver.id,
        trimmedMessage || null,
        attachmentData.file_url,
        attachmentData.file_name,
        attachmentData.file_type
      ]
    )

    if (trimmedMessage && req.user.role === 'employee') {
      const autoReplyText = BOT_AUTO_REPLIES[trimmedMessage]
      if (autoReplyText) {
        await pool.query(
          `INSERT INTO messages (
             company_id, conversation_key, sender_id, receiver_id, message
           ) VALUES ($1, $2, $3, $4, $5)`,
          [req.user.company_id, conversationKey, receiver.id, req.user.id, autoReplyText]
        )
      }
    }

    res.status(201).json({
      success: true,
      data: {
        ...result.rows[0],
        receiver: {
          id: receiver.id,
          first_name: receiver.first_name,
          last_name: receiver.last_name,
          email: receiver.email
        }
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
      `UPDATE messages
       SET seen_status = true
       WHERE company_id = $1
         AND sender_id = $2
         AND receiver_id = $3
         AND seen_status = false
       RETURNING id`,
      [req.user.company_id, conversationUser.id, req.user.id]
    )

    res.json({
      success: true,
      data: {
        updated_count: result.rowCount
      }
    })
  } catch (err) {
    console.error('Mark conversation seen error:', err)
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

    res.json({
      success: true,
      data: {
        unread_count: result.rows[0]?.unread_count || 0
      }
    })
  } catch (err) {
    console.error('Get unread message count error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getPredefinedQuestions = async (req, res) => {
  res.json({ success: true, data: QUICK_QUESTIONS })
}

module.exports = {
  getChatList,
  getConversation,
  sendMessage,
  markConversationSeen,
  getUnreadMessageCount,
  getPredefinedQuestions
}
