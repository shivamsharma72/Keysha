import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as authService from '../services/authService'

/**
 * Login Page - OAuth Flow Initiator
 * 
 * This page starts the OAuth dance:
 * 1. User clicks "Sign in with Google"
 * 2. We call our backend to get the authorization URL
 * 3. We store the code verifier (PKCE) in sessionStorage
 * 4. We redirect to Google's login page
 * 
 * Why sessionStorage for code verifier? It's only needed during the OAuth flow.
 * Once we get the token, we don't need it anymore. sessionStorage clears when
 * the tab closes, which is perfect for temporary OAuth state.
 */
const LoginPage = () => {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Get authorization URL from backend
      const { authUrl, codeVerifier } = await authService.initiateOAuth()

      // Step 2: Store code verifier for later (needed in callback)
      sessionStorage.setItem('oauth_code_verifier', codeVerifier)

      // Step 3: Redirect to Google
      window.location.href = authUrl
    } catch (err: unknown) {
      // Enhanced error handling - show more details
      let errorMessage = 'Failed to initiate login'
      
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = err.message as string
      }
      
      // Check if it's a network error (backend not running)
      if (errorMessage.includes('Network Error') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Cannot connect')) {
        // Error message already includes the actual URL from authService
        // Just make it more user-friendly
        errorMessage = errorMessage || 'Cannot connect to authentication service. Please check your configuration or try again later.'
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Request timed out. The authentication service may be slow or unavailable.'
      }
      
      console.error('Login error:', err)
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Keysha</h1>
          <p className="text-gray-600">Sign in to continue</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        <p className="mt-6 text-xs text-center text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  )
}

export default LoginPage
