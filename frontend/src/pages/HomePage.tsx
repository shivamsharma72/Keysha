import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { SparklesIcon } from '@heroicons/react/24/outline'

/**
 * Home Page - Landing Page
 * 
 * This is the public-facing landing page. If the user is already logged in,
 * we show a "Go to Dashboard" button. If not, we show a "Get Started" button
 * that leads to login.
 */
const HomePage = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <SparklesIcon className="w-20 h-20 text-primary-600" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to Keysha
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your AI-powered productivity engine. Manage actions, reminders, and events
            with seamless Gmail and Calendar integration.
          </p>
          <div className="flex justify-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
