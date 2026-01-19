import { format, formatDistanceToNow } from 'date-fns'

/**
 * Date Formatting Utilities
 * 
 * Centralized date formatting functions. Using date-fns library for
 * consistent, locale-aware date formatting.
 */

export const formatDate = (date: string | Date): string => {
  return format(new Date(date), 'MMM d, yyyy')
}

export const formatDateTime = (date: string | Date): string => {
  return format(new Date(date), 'MMM d, yyyy h:mm a')
}

export const formatRelativeTime = (date: string | Date): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
