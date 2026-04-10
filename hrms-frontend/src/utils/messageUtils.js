import api from '../services/api'

const API_ROOT = (api.defaults.baseURL || '').replace(/\/api\/v1$/, '')

const isSameDay = (leftDate, rightDate) => {
  return leftDate.getFullYear() === rightDate.getFullYear()
    && leftDate.getMonth() === rightDate.getMonth()
    && leftDate.getDate() === rightDate.getDate()
}

export const getConversationPreview = (conversation) => {
  if (conversation?.last_message) return conversation.last_message
  if (conversation?.last_file_name) return `Attachment: ${conversation.last_file_name}`
  return 'Start a conversation'
}

export const formatConversationTimestamp = (value) => {
  if (!value) return ''
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return ''

  const now = new Date()
  if (isSameDay(parsedDate, now)) {
    return parsedDate.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const timeDifference = Math.abs(now.getTime() - parsedDate.getTime())
  if (timeDifference < 7 * 24 * 60 * 60 * 1000) {
    return parsedDate.toLocaleDateString('en-IN', { weekday: 'short' })
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short'
  })
}

export const formatMessageTimestamp = (value) => {
  if (!value) return ''
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return parsedDate.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  })
}

export const getUserInitials = (firstName, lastName) => {
  const firstInitial = firstName?.charAt(0) || ''
  const lastInitial = lastName?.charAt(0) || ''
  return `${firstInitial}${lastInitial}`.trim() || 'U'
}

export const isImageAttachment = (fileType) => fileType?.startsWith('image/')

export const resolveMessageFileUrl = (fileUrl) => {
  if (!fileUrl) return ''
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl
  return `${API_ROOT}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`
}
