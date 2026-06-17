import { createContext, useContext, useState, useCallback } from 'react'
import { USERS } from '../data/mockData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('ud360_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = useCallback((email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password)
    if (!found) return { success: false, error: 'Invalid email or password.' }
    const { password: _, ...safeUser } = found
    setUser(safeUser)
    localStorage.setItem('ud360_user', JSON.stringify(safeUser))
    return { success: true, user: safeUser }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('ud360_user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
