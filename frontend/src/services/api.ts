import axios, { AxiosInstance, AxiosError } from 'axios'
import type { ApiError } from '../types'

/**
 * API Service - Centralized HTTP Client
 * 
 * Think of this as your "postal service" for API calls. Instead of writing
 * fetch() everywhere, we create one configured client that:
 * 1. Automatically adds auth tokens to every request
 * 2. Handles errors consistently
 * 3. Sets base URLs from environment variables
 * 
 * Why axios over fetch? Axios automatically transforms JSON, has interceptors
 * for request/response middleware, and better error handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
})

/**
 * Request Interceptor - Adds JWT token to every request
 * 
 * This runs BEFORE every API call. It's like a security guard checking
 * your ID before you enter a building. If you have a token, it gets
 * attached automatically.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response Interceptor - Handles errors globally
 * 
 * This runs AFTER every API response. If the server says "401 Unauthorized",
 * we know the token expired, so we log the user out automatically.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear auth and redirect
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    
    // Enhanced error message for network errors
    const serverMessage = (error.response?.data as { message?: string } | undefined)?.message
    let errorMessage = serverMessage || error.message || 'An error occurred'
    
    // Check for network/connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      errorMessage = `Cannot connect to server at ${error.config?.baseURL || API_BASE_URL}. Please ensure the backend service is running.`
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timed out. The server may be slow or unavailable.'
    } else if (!error.response) {
      // No response received (network error)
      errorMessage = `Network error: Unable to reach ${error.config?.url || 'the server'}. Please check your connection and ensure the backend is running.`
    }
    
    // Transform axios error to our ApiError format
    const apiError: ApiError = {
      message: errorMessage,
      code: error.code,
      status: error.response?.status,
    }
    
    return Promise.reject(apiError)
  }
)

export default apiClient
