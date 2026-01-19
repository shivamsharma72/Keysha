/**
 * Type Definitions for Keysha Frontend
 * 
 * TypeScript types act like "contracts" - they tell the compiler what shape
 * your data should have. Think of it like a blueprint: if you try to build
 * a house (use data) that doesn't match the blueprint (type), TypeScript
 * will warn you before you even run the code.
 */

export type ItemType = 'action' | 'reminder' | 'event'
export type ExecutionMode = 'Focus' | 'Flow' | 'Admin'
export type Priority = 'One' | 'Two' | 'Three'
export type Category = 'Work' | 'Personal' | 'Health'

export interface User {
  id: string
  email: string
  name: string
  picture?: string
}

export interface Item {
  _id: string
  userId: string
  type: ItemType
  title: string
  description?: string
  location?: string
  subtasks?: string[]
  executionMode: ExecutionMode
  priority: Priority
  category: Category
  completed: boolean
  
  // Type-specific fields
  duration?: number // ACTION: minutes
  dueDate?: string // ACTION: optional due date
  reminderTime?: string // REMINDER: when to remind
  startDate?: string // EVENT: start time
  endDate?: string // EVENT: end time
  googleCalendarId?: string // EVENT: Google Calendar sync ID
  
  createdAt: string
  updatedAt: string
}

export interface CreateItemDto {
  type: ItemType
  title: string
  description?: string
  location?: string
  subtasks?: string[]
  executionMode?: ExecutionMode
  priority?: Priority
  category?: Category
  duration?: number
  dueDate?: string
  reminderTime?: string
  startDate?: string
  endDate?: string
}

export interface UpdateItemDto {
  title?: string
  description?: string
  location?: string
  subtasks?: string[]
  executionMode?: ExecutionMode
  priority?: Priority
  category?: Category
  completed?: boolean
  duration?: number
  dueDate?: string
  reminderTime?: string
  startDate?: string
  endDate?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface ApiError {
  message: string
  code?: string
  status?: number
}
