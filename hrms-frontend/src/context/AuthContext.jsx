import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {

  const [user, setUserState] = useState(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    if (storedUser && storedToken) {
      return JSON.parse(storedUser)
    }
    return null
  })

  const login = (userData, token) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUserState(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUserState(null)
  }

  // Updates context state AND persists to localStorage so profile changes
  // (like photo uploads) survive a page refresh
  const setUser = (userData) => {
    setUserState(userData)
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    }
  }

  const value = {
    user,
    setUser,
    login,
    logout,
    isLoggedIn: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}