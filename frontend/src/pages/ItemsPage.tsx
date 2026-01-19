import { useState, useEffect } from 'react'
import * as itemService from '../services/itemService'
import type { Item, ItemType } from '../types'
import { PlusIcon } from '@heroicons/react/24/outline'

/**
 * Items Page - Full CRUD Interface for Actions, Reminders, Events
 * 
 * This page allows users to:
 * 1. View all items (with filtering by type)
 * 2. Create new items
 * 3. Update existing items
 * 4. Delete items
 * 
 * State Management: We use React's useState for local component state.
 * For more complex state (like global app state), we'd use Zustand or Context.
 */
const ItemsPage = () => {
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<ItemType | 'all'>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const data = await itemService.getItems()
      setItems(data)
    } catch (error) {
      console.error('Failed to load items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter((item) => item.type === filter)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Items</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Item
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'action', 'reminder', 'event'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === type
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="bg-white rounded-lg shadow">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">No items found.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Create your first item
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredItems.map((item) => (
              <div key={item._id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          item.type === 'action'
                            ? 'bg-blue-100 text-blue-800'
                            : item.type === 'reminder'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {item.type}
                      </span>
                      {item.completed && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                          Completed
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-gray-600 mb-2">{item.description}</p>
                    )}
                    {item.googleCalendarId && (
                      <p className="text-xs text-gray-500">
                        Synced with Google Calendar
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Form Modal - Placeholder for now */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Create New Item</h2>
            <p className="text-gray-600 mb-4">
              Form implementation coming soon. This will allow creating actions, reminders, and events.
            </p>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ItemsPage
