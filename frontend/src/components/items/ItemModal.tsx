import { useState, useEffect } from 'react'
import type { Item, ItemType, ExecutionMode, Priority, Category, CreateItemDto } from '../../types'
import * as itemService from '../../services/itemService'
import { XMarkIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline'

/**
 * Item Modal Component
 * 
 * Modal for creating/editing items (Actions, Reminders, Events).
 * Matches the design from screenshots with:
 * - Type tabs (ACTION, REMINDER, EVENT)
 * - Date/time pickers
 * - All form fields (title, description, location, subtasks, etc.)
 * - Execution mode, priority, category selectors
 * - Action buttons (Save, Cancel, Delete)
 */
interface ItemModalProps {
  item: Item | null // null = create new, Item = edit existing
  initialType?: ItemType // Optional: pre-select type when creating new item
  onClose: () => void
  onSave: () => void
}

const ItemModal = ({ item, initialType, onClose, onSave }: ItemModalProps) => {
  const [type, setType] = useState<ItemType>(item?.type || initialType || 'action')
  const [title, setTitle] = useState(item?.title || '')
  const [description, setDescription] = useState(item?.description || '')
  const [location, setLocation] = useState(item?.location || '')
  const [subtasks, setSubtasks] = useState<string[]>(item?.subtasks || [])
  const [executionMode, setExecutionMode] = useState<ExecutionMode>(
    item?.executionMode || 'Flow'
  )
  const [priority, setPriority] = useState<Priority>(item?.priority || 'Two')
  const [category, setCategory] = useState<Category>(item?.category || 'Personal')

  // Type-specific fields
  const [duration, setDuration] = useState<number | undefined>(item?.duration)
  const [dueDate, setDueDate] = useState<string>(
    item?.dueDate ? new Date(item.dueDate).toISOString().slice(0, 16) : ''
  )
  const [reminderTime, setReminderTime] = useState<string>(
    item?.reminderTime ? new Date(item.reminderTime).toISOString().slice(0, 16) : ''
  )
  const [reminderDate, setReminderDate] = useState<string>(
    item?.reminderTime ? new Date(item.reminderTime).toISOString().slice(0, 10) : ''
  )
  const [startDate, setStartDate] = useState<string>(
    item?.startDate ? new Date(item.startDate).toISOString().slice(0, 16) : ''
  )
  const [endDate, setEndDate] = useState<string>(
    item?.endDate ? new Date(item.endDate).toISOString().slice(0, 16) : ''
  )

  const [isSaving, setIsSaving] = useState(false)

  // Update type-specific fields when type changes
  useEffect(() => {
    if (!item) {
      // Reset fields when creating new item
      setDuration(undefined)
      setDueDate('')
      setReminderTime('')
      setReminderDate('')
      setStartDate('')
      setEndDate('')
    }
  }, [type, item])

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return
    }

    setIsSaving(true)

    try {
      const itemData: CreateItemDto = {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
        executionMode,
        priority,
        category,
      }

      // Add type-specific fields
      if (type === 'action') {
        if (duration) itemData.duration = duration
        if (dueDate) itemData.dueDate = new Date(dueDate).toISOString()
      } else if (type === 'reminder') {
        if (reminderTime && reminderDate) {
          const reminderDateTime = new Date(`${reminderDate}T${reminderTime}`)
          itemData.reminderTime = reminderDateTime.toISOString()
        }
      } else if (type === 'event') {
        if (startDate) itemData.startDate = new Date(startDate).toISOString()
        if (endDate) itemData.endDate = new Date(endDate).toISOString()
      }

      if (item) {
        // Update existing item
        await itemService.updateItem(item._id, itemData)
      } else {
        // Create new item
        await itemService.createItem(itemData)
      }

      onSave()
    } catch (error: any) {
      console.error('Failed to save item:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save item. Please try again.'
      alert(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return

    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await itemService.deleteItem(item._id)
      onSave()
    } catch (error) {
      console.error('Failed to delete item:', error)
      alert('Failed to delete item. Please try again.')
    }
  }

  const getTypeColor = (itemType: ItemType): string => {
    switch (itemType) {
      case 'action':
        return 'bg-blue-500 text-white'
      case 'reminder':
        return 'bg-orange-500 text-white'
      case 'event':
        return 'bg-purple-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex gap-2">
            {(['action', 'reminder', 'event'] as ItemType[]).map((itemType) => (
              <button
                key={itemType}
                onClick={() => setType(itemType)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  type === itemType
                    ? getTypeColor(itemType)
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {itemType.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Date/Time Selection Bar */}
        <div className={`${getTypeColor(type)} p-4`}>
          {type === 'action' && (
            <div className="flex justify-between items-center">
              <span>Enter Duration</span>
              <span>Select Date & Time</span>
            </div>
          )}
          {type === 'reminder' && (
            <div className="flex justify-between items-center">
              <span>Select time</span>
              <span>Select date</span>
            </div>
          )}
          {type === 'event' && (
            <div className="flex justify-between items-center">
              <span>Select Start Date & Time</span>
              <span>Select End Date & Time</span>
            </div>
          )}
        </div>

        {/* Main Form Card */}
        <div className="bg-white p-6">
          {/* Duration/Date/Time Inputs */}
          <div className="mb-4 space-y-4">
            {type === 'action' && (
              <>
                <input
                  type="number"
                  placeholder="Duration (minutes)"
                  value={duration || ''}
                  onChange={(e) => setDuration(Number(e.target.value) || undefined)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </>
            )}
            {type === 'reminder' && (
              <>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </>
            )}
            {type === 'event' && (
              <>
                <input
                  type="datetime-local"
                  placeholder="Start Date & Time"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="datetime-local"
                  placeholder="End Date & Time"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </>
            )}
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Enter task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
          />

          {/* Attribution/Location */}
          <div className="text-sm text-gray-600 mb-4">
            By You •{' '}
            <button
              onClick={() => {
                const loc = prompt('Enter location:', location)
                if (loc !== null) setLocation(loc)
              }}
              className="text-blue-600 hover:underline"
            >
              {location || 'No location provided'}
            </button>
          </div>

          {/* Description */}
          <textarea
            placeholder="Describe your task here..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 min-h-[100px]"
          />

          {/* Subtasks */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">Subtasks</h3>
            {subtasks.length === 0 ? (
              <p className="text-sm text-gray-500 mb-2">No subtasks</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-2">
                {subtasks.map((subtask, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {subtask}
                    <button
                      onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                const subtask = prompt('Enter subtask:')
                if (subtask) setSubtasks([...subtasks, subtask])
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add subtask
            </button>
          </div>
        </div>

        {/* Configuration Sections */}
        <div className="bg-gray-900 p-4 space-y-2">
          {/* Execution Mode */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
            <span className="text-gray-300">Execution Mode</span>
            <div className="flex gap-2">
              {(['Focus', 'Flow', 'Admin'] as ExecutionMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setExecutionMode(mode)}
                  className={`px-3 py-1 rounded ${
                    executionMode === mode
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
            <span className="text-gray-300">Priority</span>
            <div className="flex gap-2">
              {(['One', 'Two', 'Three'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1 rounded ${
                    priority === p
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
            <span className="text-gray-300">Category</span>
            <div className="flex gap-2">
              {(['Work', 'Personal', 'Health'] as Category[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1 rounded ${
                    category === cat
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2 p-4 border-t border-gray-800">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`${getTypeColor(type)} px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50`}
          >
            <CheckIcon className="w-5 h-5" />
            Save
          </button>
          <button
            onClick={onClose}
            className="bg-yellow-500 text-black px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <XMarkIcon className="w-5 h-5" />
            Cancel
          </button>
          {item && (
            <button
              onClick={handleDelete}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-600"
            >
              <TrashIcon className="w-5 h-5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ItemModal
