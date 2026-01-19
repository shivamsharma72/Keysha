import { useState } from 'react'
import { PlusIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import type { ItemType } from '../../types'

/**
 * Floating Action Button Component
 * 
 * A circular button that expands to show options when clicked.
 * This is a common UI pattern for quick actions (like Google's Material Design FAB).
 * 
 * Why useState for isOpen? We need to track whether the menu is expanded or collapsed.
 * When clicked, it toggles between showing just the main button or showing all options.
 */
interface FloatingActionButtonProps {
  onSelectType: (type: ItemType) => void
  onChatClick: () => void
}

const FloatingActionButton = ({ onSelectType, onChatClick }: FloatingActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleSelectType = (type: ItemType) => {
    setIsOpen(false)
    onSelectType(type)
  }

  const handleChat = () => {
    setIsOpen(false)
    onChatClick()
  }

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {/* Menu Items */}
      {isOpen && (
        <div className="absolute bottom-20 right-0 flex flex-col gap-3 mb-4">
          {/* Chat Button */}
          <button
            onClick={handleChat}
            className="bg-green-500 hover:bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
            title="Open Chat"
          >
            <ChatBubbleLeftRightIcon className="w-6 h-6" />
          </button>

          {/* Task Button */}
          <button
            onClick={() => handleSelectType('action')}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
            title="Create Task"
          >
            <span className="text-sm font-semibold">Task</span>
          </button>

          {/* Reminder Button */}
          <button
            onClick={() => handleSelectType('reminder')}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
            title="Create Reminder"
          >
            <span className="text-sm font-semibold">Reminder</span>
          </button>

          {/* Event Button */}
          <button
            onClick={() => handleSelectType('event')}
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all transform hover:scale-110"
            title="Create Event"
          >
            <span className="text-sm font-semibold">Event</span>
          </button>
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={handleToggle}
        className={`bg-primary-600 hover:bg-primary-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-all transform ${
          isOpen ? 'rotate-45' : 'hover:scale-110'
        }`}
        title={isOpen ? 'Close menu' : 'Open menu'}
      >
        <PlusIcon className="w-8 h-8" />
      </button>
    </div>
  )
}

export default FloatingActionButton
