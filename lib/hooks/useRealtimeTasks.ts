'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/lib/types'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface UseRealtimeTasksReturn {
  tasks: Task[]
  status: ConnectionStatus
  /** Manually re-fetch all tasks (e.g. after an optimistic update fails). */
  refetch: () => Promise<void>
}

/**
 * Fetches the initial task list, then subscribes to Postgres changes on the
 * `public.tasks` table so the UI stays in sync without a page reload.
 *
 * Events handled:
 *   INSERT → prepend new task
 *   UPDATE → replace existing task in-place
 *   DELETE → remove task by id
 *
 * The Realtime channel is torn down on unmount.
 */
export function useRealtimeTasks(houseIdFilter?: string): UseRealtimeTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([])
  const [status, setStatus] = useState<ConnectionStatus>('connecting')

  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    let query = supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (houseIdFilter) {
      query = query.eq('house_id', houseIdFilter)
    }

    const { data, error } = await query
    if (!error && data) {
      setTasks(data as Task[])
    }
  }, [houseIdFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let mounted = true

    fetchTasks()

    const channelName = houseIdFilter
      ? `tasks:house_id=eq.${houseIdFilter}`
      : 'tasks:all'

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          ...(houseIdFilter ? { filter: `house_id=eq.${houseIdFilter}` } : {}),
        },
        (payload) => {
          if (!mounted) return

          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task
            setTasks((prev) => [newTask, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Task
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t)),
            )
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setTasks((prev) => prev.filter((t) => t.id !== deleted.id))
          }
        },
      )
      .subscribe((channelStatus) => {
        if (!mounted) return
        if (channelStatus === 'SUBSCRIBED') setStatus('connected')
        if (channelStatus === 'CLOSED') setStatus('disconnected')
        if (channelStatus === 'CHANNEL_ERROR') setStatus('disconnected')
      })

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [houseIdFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  return { tasks, status, refetch: fetchTasks }
}
