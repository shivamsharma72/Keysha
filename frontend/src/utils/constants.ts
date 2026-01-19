/**
 * Application Constants
 * 
 * Centralized constants make it easy to update values used across the app.
 * Instead of hardcoding "dashboard" in 10 places, we define it once here.
 */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  CALLBACK: '/auth/callback',
  DASHBOARD: '/dashboard',
  ITEMS: '/items',
  CHAT: '/chat',
} as const

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER: 'user',
  OAUTH_CODE_VERIFIER: 'oauth_code_verifier',
} as const

export const ITEM_TYPES = {
  ACTION: 'action',
  REMINDER: 'reminder',
  EVENT: 'event',
} as const
