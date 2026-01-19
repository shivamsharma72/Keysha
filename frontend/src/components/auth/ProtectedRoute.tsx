import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Protected Route Component - Route Guard
 * 
 * Think of this as a "bouncer" at a club. If you're not authenticated (don't have
 * a valid token), you get redirected to the login page. If you are authenticated,
 * you're allowed through to see the protected content.
 * 
 * Why a component instead of a route config? React Router v6 uses components
 * for route protection, giving us more flexibility.
 */
interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // User is authenticated, render the protected content
  return <>{children}</>
}
