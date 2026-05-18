const express = require('express')
const router = express.Router()
const authenticate = require('../middleware/authenticate')
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

router.get('/unread-count', getUnreadMessageCount)
router.get('/chat-list', getChatList)
router.get('/predefined-questions', getPredefinedQuestions)
router.get('/conversation', getConversation)
router.put('/seen', markConversationSeen)
router.put('/:id', editMessage)
router.post('/', sendMessage)

module.exports = router