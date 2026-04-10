/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { getUnreadMessageCount } from '../services/messageService'

const MessagingContext = createContext(null)

const isMessagingRole = (role) => ['manager', 'employee'].includes(role)

const fetchUnreadCount = async () => {
  const response = await getUnreadMessageCount()
  return response.data?.data?.unread_count || 0
}

export function MessagingProvider({ children }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const userRole = user?.role

  const refreshUnreadCount = async () => {
    if (!isMessagingRole(userRole)) {
      setUnreadCount(0)
      return 0
    }

    try {
      const nextUnreadCount = await fetchUnreadCount()
      setUnreadCount(nextUnreadCount)
      return nextUnreadCount
    } catch (err) {
      console.error('Unread message count error:', err)
      return 0
    }
  }

  useEffect(() => {
    let isSubscribed = true

    const syncUnreadCount = async () => {
      if (!isMessagingRole(userRole)) {
        if (isSubscribed) {
          setUnreadCount(0)
        }
        return
      }

      try {
        const nextUnreadCount = await fetchUnreadCount()
        if (isSubscribed) {
          setUnreadCount(nextUnreadCount)
        }
      } catch (err) {
        console.error('Unread message polling error:', err)
      }
    }

    syncUnreadCount()
    if (!isMessagingRole(userRole)) {
      return () => {
        isSubscribed = false
      }
    }

    const intervalId = window.setInterval(syncUnreadCount, 12000)

    return () => {
      isSubscribed = false
      window.clearInterval(intervalId)
    }
  }, [userRole, user?.id])

  return (
    <MessagingContext.Provider value={{ unreadCount, refreshUnreadCount, setUnreadCount }}>
      {children}
    </MessagingContext.Provider>
  )
}

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (!context) {
    throw new Error('useMessaging must be used inside MessagingProvider')
  }
  return context
}
