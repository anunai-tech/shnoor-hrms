const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const {
  getChatList,
  getConversation,
  sendMessage,
  editMessage,
  markConversationSeen,
  getUnreadMessageCount,
  getPredefinedQuestions
} = require('../controllers/messageController')

router.use(authenticate)
router.use(authorize('manager', 'employee'))

router.get('/chat-list', getChatList)
router.get('/conversation', getConversation)
router.post('/', sendMessage)
router.put('/seen', markConversationSeen)
router.put('/:id', editMessage)
router.get('/unread-count', getUnreadMessageCount)
router.get('/predefined-questions', getPredefinedQuestions)

module.exports = router
