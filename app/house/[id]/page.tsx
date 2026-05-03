export const runtime = 'edge'

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { House, Task } from '@/lib/types'
import HousePageClient from './HousePageClient'

interface PageProps {
  // In Next.js 15, params is a Promise
  params: Promise<{ id: string }>
}

/**
 * Server Component — fetches house data and pending tasks on the server,
 * then hands off to the interactive Client Component.
 *
 * URL entry point: /house/[id]
 * Accessed via NFC tag, QR code, or direct link.
 */
export default async function HousePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Validate the house exists before rendering
  const { data: house, error: houseError } = await supabase
    .from('houses')
    .select('*')
    .eq('id', id)
    .single<House>()

  if (houseError || !house) {
    notFound()
  }

  // Fetch all pending tasks for the blocking modal
  const { data: pendingTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('house_id', id)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })

  return (
    <HousePageClient
      house={house}
      initialPendingTasks={(pendingTasks ?? []) as Task[]}
    />
  )
}
