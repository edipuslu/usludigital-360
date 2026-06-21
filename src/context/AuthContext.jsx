import { createContext, useContext, useState, useCallback } from 'react'
import { USERS } from '../data/mockData'
import { getCompanies } from '../lib/backendApi'

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

  const login = useCallback(async (email, password) => {
    const found = USERS.find(u => u.email === email && u.password === password)
    let safeUser = null
    if (found) {
      const { password: _, ...userWithoutPassword } = found
      safeUser = userWithoutPassword
    } else {
      try {
        const data = await getCompanies()
        const companies = Array.isArray(data.companies) ? data.companies : []
        const company = companies.find(item => {
          const loginId = String(item.clientEmail || '').trim().toLowerCase()
          return loginId && loginId === String(email || '').trim().toLowerCase() && String(item.clientPassword || '') === String(password || '')
        })
        if (company) {
          safeUser = {
            id: `client-${company.id}`,
            email: company.clientEmail,
            role: 'client',
            name: company.clientName || company.name,
            avatar: company.initials || 'CL',
            companyId: company.id,
          }
        }
      } catch {
        return { success: false, error: 'Could not check company access right now. Try again.' }
      }
    }

    if (!safeUser) return { success: false, error: 'Invalid email or password.' }
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
