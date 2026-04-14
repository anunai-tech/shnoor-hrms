import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {

  const [user, setUser] = useState(() => {
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
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
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