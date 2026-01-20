import apiClient from './api'

/**
 * AI Service - Communication with Gemini MCP Service
 * 
 * This service talks to the Python FastAPI service running on Cloud Run.
 * The AI service uses RAG (Retrieval-Augmented Generation) to provide
 * context-aware responses based on your past items and preferences.
 */

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface ChatRequest {
  message: string
  conversationHistory?: ChatMessage[]
}

export interface ChatResponse {
  message: string
  intent?: {
    action: 'create_item' | 'update_item' | 'search' | 'none'
    itemType?: 'action' | 'reminder' | 'event'
    data?: Record<string, unknown>
  }
}

/**
 * Sends a chat message to the AI agent
 * 
 * The AI service:
 * 1. Uses Vector Search to find relevant past items/preferences
 * 2. Sends context + message to Gemini 2.0 Flash
 * 3. Returns response + detected intent (e.g., "user wants to create an action")
 * 
 * Intent Detection: The AI can "decide" to create items automatically.
 * For example, "Remind me to call mom tomorrow" → intent: create_item, type: reminder
 */
export const sendChatMessage = async (request: ChatRequest): Promise<ChatResponse> => {
  // AI calls can take longer than typical CRUD requests (LLM reasoning + tool calls).
  // Override the default axios timeout (10s) to avoid frontend showing a generic error.
  const response = await apiClient.post(`${AI_SERVICE_URL}/chat`, request, {
    timeout: 120000, // 120 seconds (2 minutes) - AI + MCP tool calls can take time
  })
  return response.data
}

/**
 * Searches Gmail using MCP tools
 * 
 * This calls the MCP server's search_gmail tool. The MCP protocol allows
 * the AI agent to interact with external services (Gmail, Calendar) in a
 * standardized way.
 */
export const searchGmail = async (query: string): Promise<unknown> => {
  const response = await apiClient.post(`${AI_SERVICE_URL}/mcp/search-gmail`, { query })
  return response.data
}
