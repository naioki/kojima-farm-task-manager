'use client'

import { useState } from 'react'
import type { House, Task } from '@/lib/types'
import { TaskPopupModal } from '@/components/TaskPopupModal'
import { ChatInterface } from '@/components/ChatInterface'

interface HousePageClientProps {
  house: House
  initialPendingTasks: Task[]
}

/**
 * Root client component for the house page.
 * Manages the blocking task modal and coordinates with the chat interface.
 */
export default function HousePageClient({ house, initialPendingTasks }: HousePageClientProps) {
  const [pendingTasks, setPendingTasks] = useState<Task[]>(initialPendingTasks)
  const [showModal, setShowModal] = useState(initialPendingTasks.length > 0)

  const handleTaskUpdate = (taskId: string, action: 'completed' | 'snoozed') => {
    // Both actions remove the task from the modal view.
    // 'completed' also writes to Supabase (handled inside the modal component).
    setPendingTasks(prev => {
      const updated = prev.filter(t => t.id !== taskId)
      if (updated.length === 0) setShowModal(false)
      return updated
    })
  }

  return (
    // h-dvh (dynamic viewport height) shrinks when the virtual keyboard appears,
    // so the input bar always stays visible above the keyboard on iOS/Android.
    <div className="flex h-dvh flex-col bg-green-50">
      {/* App header */}
      <header className="flex-shrink-0 bg-green-700 px-4 py-3 shadow-md text-white">
        <h1 className="text-lg font-bold leading-tight">🌱 {house.name}</h1>
        <p className="mt-0.5 text-xs text-green-200">農業DXタスク管理システム</p>
      </header>

      {/* Blocking modal — user must address all pending tasks before the UI is usable */}
      {showModal && pendingTasks.length > 0 && (
        <TaskPopupModal
          tasks={pendingTasks}
          houseName={house.name}
          onTaskUpdate={handleTaskUpdate}
        />
      )}

      {/* Main chat interface — fills remaining height, clips scroll internally */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">
        <ChatInterface houseId={house.id} houseName={house.name} />
      </main>
    </div>
  )
}
