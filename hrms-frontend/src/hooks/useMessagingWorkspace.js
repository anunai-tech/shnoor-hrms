import { useEffect, useState } from 'react'
import { useMessaging } from '../context/MessagingContext'
import {
  getChatList,
  getConversation,
  sendMessage,
  editMessage,
  markConversationSeen,
  getPredefinedQuestions
} from '../services/messageService'

const POLL_INTERVAL = 12000

const getErrorMessage = (error, fallbackMessage) => {
  return error.response?.data?.message || error.message || fallbackMessage
}

export function useMessagingWorkspace({ withQuickQuestions = false, autoSelect = 'first' } = {}) {
  const { refreshUnreadCount } = useMessaging()
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [quickQuestions, setQuickQuestions] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [conversationLoading, setConversationLoading] = useState(true)
  const [error, setError] = useState('')

  const chooseConversation = (items, preferredUserId) => {
    if (!items.length) return null

    if (preferredUserId) {
      return items.find(item => item.user_id === preferredUserId) || null
    }

    if (activeConversation?.user_id) {
      return items.find(item => item.user_id === activeConversation.user_id) || null
    }

    if (autoSelect === 'unread_first') {
      const unreadConversation = items.find(item => item.unread_count > 0)
      if (unreadConversation) return unreadConversation
    }

    return items[0]
  }

  const syncChatList = async ({ preferredUserId, silent = false } = {}) => {
    if (!silent) {
      setListLoading(true)
    }

    try {
      const response = await getChatList()
      const items = response.data?.data || []
      const nextConversation = chooseConversation(items, preferredUserId)

      setConversations(items)
      setActiveConversation(currentConversation => {
        if (!nextConversation) return null
        if (currentConversation?.user_id === nextConversation.user_id) {
          return { ...currentConversation, ...nextConversation }
        }
        return nextConversation
      })

      return nextConversation
    } finally {
      if (!silent) {
        setListLoading(false)
      }
    }
  }

  const syncConversation = async (conversation, { markSeen = true, silent = false } = {}) => {
    if (!conversation?.user_id) {
      setMessages([])
      if (!silent) {
        setConversationLoading(false)
      }
      return null
    }

    if (!silent) {
      setConversationLoading(true)
    }

    try {
      const response = await getConversation(conversation.user_id)
      const payload = response.data?.data || {}
      const counterpart = {
        ...conversation,
        ...payload.counterpart,
        user_id: payload.counterpart?.id,
        unread_count: 0
      }

      setMessages(payload.messages || [])
      setActiveConversation(counterpart)

      if (markSeen && payload.counterpart?.id) {
        await markConversationSeen(payload.counterpart.id)
        setConversations(currentConversations => currentConversations.map(item => (
          item.user_id === payload.counterpart.id
            ? { ...item, unread_count: 0 }
            : item
        )))
        await refreshUnreadCount()
      }

      return counterpart
    } finally {
      if (!silent) {
        setConversationLoading(false)
      }
    }
  }

  const refreshWorkspace = async ({ silent = false } = {}) => {
    if (!silent) {
      setListLoading(true)
      setConversationLoading(true)
    }

    setError('')

    try {
      if (withQuickQuestions) {
        const questionsResponse = await getPredefinedQuestions()
        setQuickQuestions(questionsResponse.data?.data || [])
      }

      const nextConversation = await syncChatList({
        preferredUserId: activeConversation?.user_id,
        silent: true
      })

      if (nextConversation) {
        await syncConversation(nextConversation, { markSeen: true, silent: true })
      } else {
        setActiveConversation(null)
        setMessages([])
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load messages'))
    } finally {
      if (!silent) {
        setListLoading(false)
        setConversationLoading(false)
      }
    }
  }

  const selectConversation = async (conversation) => {
    setError('')
    try {
      await syncConversation(conversation, { markSeen: true, silent: false })
      await syncChatList({ preferredUserId: conversation.user_id, silent: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to open conversation'))
      setConversationLoading(false)
    }
  }

  const sendCurrentMessage = async (payload) => {
    if (!activeConversation?.user_id) {
      throw new Error('No conversation selected')
    }

    await sendMessage({
      ...payload,
      receiver_id: activeConversation.user_id
    })

    try {
      await Promise.all([
        syncChatList({ preferredUserId: activeConversation.user_id, silent: true }),
        syncConversation(activeConversation, { markSeen: false, silent: true }),
        refreshUnreadCount()
      ])
    } catch (err) {
      console.error('Post-send sync error:', err)
    }
  }

  const sendQuickQuestion = async (questionText) => {
    await sendCurrentMessage({ message: questionText })
  }

  const editCurrentMessage = async (messageId, newContent) => {
    if (!activeConversation?.user_id) return
    await editMessage(messageId, newContent)
    try {
      await syncConversation(activeConversation, { markSeen: false, silent: true })
    } catch (err) {
      console.error('Post-edit sync error:', err)
    }
  }

  useEffect(() => {
    refreshWorkspace()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      try {
        const nextConversation = await syncChatList({
          preferredUserId: activeConversation?.user_id,
          silent: true
        })

        if (nextConversation) {
          await syncConversation(nextConversation, { markSeen: true, silent: true })
        }
      } catch (err) {
        console.error('Messaging polling error:', err)
      }
    }, POLL_INTERVAL)

    return () => window.clearInterval(intervalId)
  }, [activeConversation?.user_id])

  return {
    conversations,
    activeConversation,
    messages,
    quickQuestions,
    listLoading,
    conversationLoading,
    error,
    selectConversation,
    sendCurrentMessage,
    sendQuickQuestion,
    editCurrentMessage,
    refreshWorkspace
  }
}
