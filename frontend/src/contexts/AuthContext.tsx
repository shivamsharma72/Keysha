import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User, AuthState } from '../types'
import * as authService from '../services/authService'

/**
 * Auth Context - Global Authentication State Management
 * 
 * Think of Context as a "shared storage room" that any component can access.
 * Instead of passing user data through 10 levels of components (prop drilling),
 * we store it here and any component can "subscribe" to it.
 * 
 * Why Context over Redux? For auth state, Context is simpler and built-in.
 * Zustand (which we'll use for other state) is great for complex state, but
 * Context is perfect for this use case.
 */

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Initialize Auth State from Local Storage
   * 
   * On app load, we check if there's a saved token. If yes, we restore
   * the user session. This is why you stay logged in after refreshing the page.
   * 
   * Why localStorage? It persists across browser sessions. sessionStorage
   * would clear when you close the tab.
   */
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('auth_token')
      const savedUser = localStorage.getItem('user')

      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        
        // Try to refresh token to ensure it's still valid
        try {
          await refreshAuth()
        } catch (error) {
          // Token invalid, clear everything
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          setToken(null)
          setUser(null)
        }
      }
      
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  /**
   * Login Function - Stores token and user in state + localStorage
   * 
   * This is called after successful OAuth callback. We store both in:
   * 1. React state (for immediate UI updates)
   * 2. localStorage (for persistence across page refreshes)
   */
  const login = (newToken: string, newUser: User) => {
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('auth_token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  /**
   * Logout Function - Clears everything
   * 
   * Calls the backend to invalidate refresh token, then clears
   * local state and storage.
   */
  const logout = async () => {
    await authService.logout()
    setToken(null)
    setUser(null)
  }

  /**
   * Refresh Auth Token
   * 
   * Called periodically or when API returns 401. Gets a new JWT
   * from the backend using the refresh token (stored securely on backend).
   */
  const refreshAuth = async () => {
    try {
      const response = await authService.refreshToken()
      login(response.token, response.user)
    } catch (error) {
      // Refresh failed, user needs to log in again
      logout()
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * useAuth Hook - Easy access to auth context
 * 
 * This is a custom hook that components use to access auth state.
 * It throws an error if used outside AuthProvider (safety check).
 */
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
