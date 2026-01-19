import type { Item } from '../../types'
import { format } from 'date-fns'
import { CheckIcon } from '@heroicons/react/24/outline'
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid'

/**
 * Item Card Component
 * 
 * Displays a single item (Action, Reminder, or Event) as a card.
 * Based on screenshots, cards have:
 * - Different colors by type (orange, light blue, pink)
 * - Checkmark icon for completion
 * - Time/duration display
 */
interface ItemCardProps {
  item: Item
  onEdit: () => void
  onToggleComplete: () => void
}

const ItemCard = ({ item, onEdit, onToggleComplete }: ItemCardProps) => {
  // Color mapping based on screenshot
  const getColorClass = () => {
    if (item.completed) {
      return 'bg-gray-100 border-gray-300'
    }

    switch (item.type) {
      case 'action':
        return 'bg-orange-100 border-orange-300'
      case 'reminder':
        return 'bg-pink-100 border-pink-300'
      case 'event':
        return 'bg-blue-100 border-blue-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  // Format time display
  const getTimeDisplay = (): string => {
    if (item.type === 'action' && item.duration) {
      return `${item.duration}m`
    }
    if (item.type === 'event' && item.startDate && item.endDate) {
      const start = new Date(item.startDate)
      const end = new Date(item.endDate)
      return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
    }
    if (item.type === 'reminder' && item.reminderTime) {
      const time = new Date(item.reminderTime)
      return format(time, 'h:mm a')
    }
    return ''
  }

  return (
    <div
      className={`${getColorClass()} border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">{item.title}</h3>
          {getTimeDisplay() && (
            <p className="text-xs text-gray-600">{getTimeDisplay()}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleComplete()
          }}
          className="ml-2 flex-shrink-0"
        >
          {item.completed ? (
            <CheckIconSolid className="w-5 h-5 text-green-600" />
          ) : (
            <CheckIcon className="w-5 h-5 text-gray-400 hover:text-green-600" />
          )}
        </button>
      </div>
    </div>
  )
}

export default ItemCard
