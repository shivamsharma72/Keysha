import { useState, useRef, useEffect } from 'react'
import * as aiService from '../services/aiService'
import type { ChatMessage } from '../services/aiService'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'

/**
 * Chat Page - AI Assistant Interface
 * 
 * This page provides a chat interface to interact with the Gemini AI agent.
 * The AI can:
 * 1. Answer questions using RAG (Retrieval-Augmented Generation)
 * 2. Detect intents (e.g., "create a reminder")
 * 3. Automatically create items based on user requests
 * 
 * Conversation History Persistence:
 * - Messages are stored in localStorage so they persist across navigation
 * - Each user has their own conversation history (keyed by userId)
 * - History is loaded on mount and saved whenever messages change
 * 
 * Why useRef for messages? We want to maintain message history, but we also
 * want to scroll to the bottom when new messages arrive. useRef helps us
 * access the DOM element directly for scrolling.
 */
const ChatPage = () => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get storage key for this user's conversation
  const getStorageKey = () => {
    const userId = user?.id || 'anonymous'
    return `keysha_chat_history_${userId}`
  }

  // Load conversation history from localStorage on mount
  useEffect(() => {
    try {
      const storageKey = getStorageKey()
      const savedMessages = localStorage.getItem(storageKey)
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages) as ChatMessage[]
        setMessages(parsed)
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error)
    }
  }, [user?.id]) // Reload when user changes

  // Save conversation history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const storageKey = getStorageKey()
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch (error) {
        console.error('Failed to save conversation history:', error)
      }
    }
  }, [messages, user?.id])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await aiService.sendChatMessage({
        message: userMessage.content,
        conversationHistory: messages,
      })

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      // If AI detected an intent to create an item, we could trigger that here
      if (response.intent?.action === 'create_item') {
        // TODO: Integrate with itemService to create item
        console.log('AI wants to create item:', response.intent)
      }
    } catch (error) {
      const errorText =
        typeof error === 'object' && error && 'message' in error
          ? String((error as any).message)
          : 'Sorry, I encountered an error. Please try again.'
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: errorText,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">AI Assistant</h1>

      {/* Messages Container */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-y-auto p-6 mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">Start a conversation with Keysha AI</p>
              <p className="text-sm">Ask me to create reminders, schedule events, or search your emails.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}

export default ChatPage
