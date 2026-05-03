'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/lib/types'

interface TaskPopupModalProps {
  tasks: Task[]
  houseName: string
  /** Called after the user acts on a task so the parent can update its state */
  onTaskUpdate: (taskId: string, action: 'completed' | 'snoozed') => void
}

/**
 * Blocking modal that forces the user to acknowledge all pending tasks
 * before accessing the main screen.
 *
 * The backdrop is intentionally non-interactive — there is no outside-click
 * dismiss. Every task must be marked Done or Snoozed.
 */
export function TaskPopupModal({ tasks, houseName, onTaskUpdate }: TaskPopupModalProps) {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const supabase = createClient()

  const markComplete = async (task: Task) => {
    if (processingId) return
    setProcessingId(task.id)
    setErrorId(null)

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', task.id)

    if (error) {
      console.error('Failed to complete task:', error)
      setErrorId(task.id)
      setProcessingId(null)
      return
    }

    setProcessingId(null)
    onTaskUpdate(task.id, 'completed')
  }

  const snoozeTask = (task: Task) => {
    if (processingId) return
    // Snooze removes from the modal without changing DB status
    onTaskUpdate(task.id, 'snoozed')
  }

  return (
    // Blocking overlay — pointer-events-none NOT applied; backdrop is solid and non-clickable
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="bg-amber-500 px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5" aria-hidden="true">⚠️</span>
            <div>
              <h2 id="modal-title" className="text-white font-bold text-lg leading-tight">
                未完了タスクがあります
              </h2>
              <p className="text-amber-100 text-sm mt-0.5">{houseName}</p>
            </div>
          </div>
        </div>

        {/* ── Task list ────────────────────────────────────────── */}
        <div className="px-6 py-5 max-h-72 overflow-y-auto">
          <p className="text-gray-500 text-sm mb-4">
            作業を開始する前に、以下のタスクを確認してください。
          </p>

          <ul className="space-y-3" role="list">
            {tasks.map(task => {
              const isProcessing = processingId === task.id
              const hasError = errorId === task.id

              return (
                <li
                  key={task.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="text-gray-800 font-medium text-sm leading-snug">
                    {task.task_description}
                  </p>

                  {task.due_date && (
                    <p className="text-gray-400 text-xs mt-1">
                      期日: {new Date(task.due_date).toLocaleDateString('ja-JP')}
                    </p>
                  )}

                  {hasError && (
                    <p className="text-red-500 text-xs mt-1">
                      更新に失敗しました。もう一度お試しください。
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => markComplete(task)}
                      disabled={!!processingId}
                      aria-busy={isProcessing}
                      className="flex-1 rounded-lg bg-green-600 py-2 px-3 text-sm font-medium text-white
                                 transition-colors hover:bg-green-700
                                 disabled:cursor-not-allowed disabled:bg-green-300"
                    >
                      {isProcessing ? '処理中...' : '✅ 完了'}
                    </button>

                    <button
                      type="button"
                      onClick={() => snoozeTask(task)}
                      disabled={!!processingId}
                      className="flex-1 rounded-lg bg-gray-200 py-2 px-3 text-sm font-medium text-gray-700
                                 transition-colors hover:bg-gray-300
                                 disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      🕐 後で
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-3">
          <p className="text-center text-xs text-gray-400">
            全てのタスクを確認するとメイン画面にアクセスできます
          </p>
        </div>
      </div>
    </div>
  )
}
