import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import * as authService from '../services/authService'
import axios from 'axios'

/**
 * OAuth Callback Page - Completes the OAuth Flow
 * 
 * This page is where Google redirects after the user logs in. The URL contains:
 * - ?code=... (the authorization code from Google)
 * - ?error=... (if something went wrong)
 * 
 * Our job here:
 * 1. Extract the code from URL
 * 2. Get the code verifier from sessionStorage (stored in LoginPage)
 * 3. Send both to our backend to exchange for a JWT token
 * 4. Store the token and redirect to dashboard
 * 
 * Why a separate callback page? OAuth requires a redirect URL. This page
 * is that URL - it's the "handoff point" between Google and our app.
 */
const CallbackPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      // Check for OAuth error
      const oauthError = searchParams.get('error')
      if (oauthError) {
        setStatus('error')
        setError('Authentication failed. Please try again.')
        return
      }

      // Get authorization code from URL
      const code = searchParams.get('code')
      if (!code) {
        setStatus('error')
        setError('No authorization code received.')
        return
      }

      // Get code verifier from sessionStorage (stored during login initiation)
      const codeVerifier = sessionStorage.getItem('oauth_code_verifier')
      if (!codeVerifier) {
        setStatus('error')
        setError('OAuth session expired. Please try logging in again.')
        return
      }

      try {
        // Exchange code for token
        const { token, user } = await authService.exchangeCodeForToken(code, codeVerifier)

        // Clear the code verifier (no longer needed)
        sessionStorage.removeItem('oauth_code_verifier')

        // Store token and user in auth context
        login(token, user)

        // Subscribe to Google Calendar webhooks (one-time setup)
        // This tells Google: "When this user's calendar changes, notify Keysha"
        try {
          const INTEGRATION_SERVICE_URL = import.meta.env.VITE_INTEGRATION_SERVICE_URL
          if (!INTEGRATION_SERVICE_URL) {
            console.warn('⚠️ VITE_INTEGRATION_SERVICE_URL not set - skipping webhook subscription')
          } else {
            await axios.post(`${INTEGRATION_SERVICE_URL}/subscriptions/calendar`, {}, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            })
            console.log('✅ Subscribed to Google Calendar webhooks')
          }
        } catch (error: any) {
          // Non-fatal: Webhooks won't work, but user can still use manual sync
          console.warn('⚠️ Failed to subscribe to webhooks (non-fatal):', error.message)
          console.warn('   You can still use the refresh button to sync manually')
        }

        // Redirect to dashboard
        navigate('/dashboard', { replace: true })
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Failed to complete login')
      }
    }

    handleCallback()
  }, [searchParams, navigate, login])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  )
}

export default CallbackPage
