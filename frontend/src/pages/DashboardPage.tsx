import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as itemService from '../services/itemService'
import type { Item, ItemType } from '../types'
import { format, addDays, startOfDay, isSameDay } from 'date-fns'
import ItemCard from '../components/items/ItemCard'
import ItemModal from '../components/items/ItemModal'
import FloatingActionButton from '../components/layout/FloatingActionButton'
import { ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline'

/**
 * Dashboard Page - Calendar Flow View
 * 
 * This is the main calendar view showing items across multiple days.
 * Based on the screenshot, it displays:
 * - Today, Tomorrow, and future dates
 * - Task cards with different colors by type
 * - Free time calculations
 * - Drag-and-drop areas (placeholder for now)
 */
const DashboardPage = () => {
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [initialModalType, setInitialModalType] = useState<ItemType | undefined>(undefined)
  const [weeksToShow] = useState(4) // Show 4 weeks

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setIsLoading(true)
      const startDate = startOfDay(new Date())
      const endDate = addDays(startDate, weeksToShow * 7) // Load items for N weeks
      const data = await itemService.getItemsForCalendar(startDate, endDate)
      setItems(data)
      console.log(`Loaded ${data.length} items for dashboard`)
    } catch (error) {
      console.error('Failed to load items:', error)
      alert('Failed to load items. Please refresh the page.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncCalendar = async () => {
    try {
      setIsLoading(true)
      const startDate = startOfDay(new Date())
      const endDate = addDays(startDate, weeksToShow * 7) // Sync for N weeks
      
      console.log('Starting sync...', { startDate, endDate })
      
      // Perform full sync
      const result = await itemService.syncCalendar(startDate, endDate)
      
      console.log('Sync completed:', result.stats)
      
      // Reload items after sync
      await loadItems()
      
      // Show success message
      alert(`Sync completed! Created: ${result.stats.googleToApp.created + result.stats.appToGoogle.created}, Updated: ${result.stats.googleToApp.updated + result.stats.appToGoogle.updated}`)
    } catch (error: any) {
      console.error('Failed to sync calendar:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error'
      console.error('Error details:', {
        message: errorMessage,
        status: error?.response?.status,
        url: error?.config?.url,
      })
      alert(`Failed to sync calendar: ${errorMessage}. Check console for details.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateItem = (type?: ItemType) => {
    setEditingItem(null)
    setInitialModalType(type)
    setIsModalOpen(true)
  }

  const handleChatClick = () => {
    navigate('/chat')
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    loadItems() // Refresh items after modal closes
  }

  const handleToggleComplete = async (item: Item) => {
    try {
      await itemService.toggleComplete(item._id, !item.completed)
      loadItems()
    } catch (error) {
      console.error('Failed to toggle complete:', error)
    }
  }

  // Group items by date
  const itemsByDate = items.reduce((acc, item) => {
    let date: Date
    if (item.type === 'event' && item.startDate) {
      date = new Date(item.startDate)
    } else if (item.type === 'action' && item.dueDate) {
      date = new Date(item.dueDate)
    } else if (item.type === 'reminder' && item.reminderTime) {
      date = new Date(item.reminderTime)
    } else {
      date = new Date(item.createdAt)
    }

    const dateKey = format(startOfDay(date), 'yyyy-MM-dd')
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(item)
    return acc
  }, {} as Record<string, Item[]>)

  // Get items for a specific date
  const getItemsForDate = (date: Date): Item[] => {
    const dateKey = format(startOfDay(date), 'yyyy-MM-dd')
    return itemsByDate[dateKey] || []
  }

  // Calculate free time for a date (simplified - 8 hours minus item durations)
  const calculateFreeTime = (date: Date): { hours: number; minutes: number } => {
    const dateItems = getItemsForDate(date)
    const totalMinutes = dateItems.reduce((sum, item) => {
      if (item.type === 'action' && item.duration) {
        return sum + item.duration
      } else if (item.type === 'event' && item.startDate && item.endDate) {
        const start = new Date(item.startDate)
        const end = new Date(item.endDate)
        return sum + (end.getTime() - start.getTime()) / (1000 * 60)
      }
      return sum
    }, 0)

    const totalHours = 8 // Assume 8 hours work day
    const usedHours = totalMinutes / 60
    const freeHours = Math.max(0, totalHours - usedHours)

    return {
      hours: Math.floor(freeHours),
      minutes: Math.round((freeHours - Math.floor(freeHours)) * 60),
    }
  }

  // Generate date columns for multiple weeks
  const generateDateColumns = () => {
    const columns: Array<{ date: Date; label: string }> = []
    const today = new Date()
    
    // Add today and tomorrow
    columns.push({ date: today, label: 'Today' })
    columns.push({ date: addDays(today, 1), label: 'Tomorrow' })
    
    // Add remaining days for N weeks
    for (let i = 2; i < weeksToShow * 7; i++) {
      const date = addDays(today, i)
      const isStartOfWeek = i > 2 && date.getDay() === 0 // Sunday
      
      if (isStartOfWeek) {
        columns.push({ date, label: format(date, 'EEE d MMM') })
      } else {
        columns.push({ date, label: format(date, 'EEE d MMM') })
      }
    }
    
    return columns
  }

  const dateColumns = generateDateColumns()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <h1 className="text-3xl font-bold text-gray-900">Calendar Flow</h1>
        <div className="flex gap-2">
          <button
            onClick={handleSyncCalendar}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            title="Sync with Google Calendar"
            disabled={isLoading}
          >
            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <CheckIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Calendar Columns */}
      <div className="flex-1 overflow-x-auto overflow-y-auto pb-20">
        <div className="inline-flex gap-6 min-w-full">
          {dateColumns.map(({ date, label }, index) => {
            const dateItems = getItemsForDate(date)
            const freeTime = calculateFreeTime(date)
            const isToday = isSameDay(date, new Date())

            return (
              <div key={`${label}-${index}`} className="bg-white rounded-lg shadow p-4 min-w-[280px] flex-shrink-0">
                {/* Date Header */}
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
                  {isToday && (
                    <p className="text-sm text-gray-500">{format(date, 'EEEE')}</p>
                  )}
                </div>

                {/* Drop Zone / Items */}
                <div className="space-y-2 min-h-[200px]">
                  {dateItems.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                      Drop tasks here
                    </div>
                  ) : (
                    dateItems.map((item) => (
                      <ItemCard
                        key={item._id}
                        item={item}
                        onEdit={() => handleEditItem(item)}
                        onToggleComplete={() => handleToggleComplete(item)}
                      />
                    ))
                  )}
                </div>

                {/* Free Time */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Free Time ({freeTime.hours}h {freeTime.minutes}m)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {freeTime.hours > 0
                      ? `${freeTime.hours}h ${freeTime.minutes}m`
                      : 'No time'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton
        onSelectType={handleCreateItem}
        onChatClick={handleChatClick}
      />

      {/* Item Modal */}
      {isModalOpen && (
        <ItemModal
          item={editingItem}
          initialType={initialModalType}
          onClose={handleModalClose}
          onSave={handleModalClose}
        />
      )}
    </div>
  )
}

export default DashboardPage
