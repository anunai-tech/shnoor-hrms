import api from './api'

export const getChatList = () => api.get('/messages/chat-list')

export const getConversation = (userId) => {
  const searchParams = new URLSearchParams()
  if (userId) {
    searchParams.set('userId', userId)
  }

  const queryString = searchParams.toString()
  return api.get(`/messages/conversation${queryString ? `?${queryString}` : ''}`)
}

export const sendMessage = (data) => api.post('/messages', data)

export const editMessage = (id, new_message) => api.put(`/messages/${id}`, { new_message })

export const markConversationSeen = (userId) => api.put('/messages/seen', userId ? { userId } : {})

export const getUnreadMessageCount = () => api.get('/messages/unread-count')

export const getPredefinedQuestions = () => api.get('/messages/predefined-questions')
