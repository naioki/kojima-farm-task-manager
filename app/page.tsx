// Farm Map Dashboard — top-level entry point for agricultural staff.
//
// DATA TODO: Replace MOCK_ZONES and MOCK_TASKS with live Supabase queries:
//   1. Get house IDs:  SELECT id, name FROM public.houses;
//   2. Replace each `id` in MOCK_ZONES with the real UUID from your DB.
//   3. Swap the mock arrays for:
//        const supabase = await createClient()          (add: import { createClient } from '@/lib/supabase/server')
//        const tomorrow = tomorrowISO()                 (add: export const runtime = 'edge')
//        const { data: tasks } = await supabase
//          .from('tasks')
//          .select('id, house_id, task_description, due_date, status')
//          .eq('due_date', tomorrow)
//          .eq('status', 'pending')
//          .order('due_date')

import { FarmMapDashboard, type FarmZone, type FarmTask } from '@/components/FarmMapDashboard'

// ── Date helpers ───────────────────────────────────────────────

function tomorrowISO(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
}

function tomorrowLabel(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

// ── Mock zone layout ───────────────────────────────────────────
// ⚠️  Replace each `id` with the real UUID from your Supabase `houses` table.
//     Run in the Supabase SQL editor:  SELECT id, name FROM public.houses;

const MOCK_ZONES: FarmZone[] = [
  {
    id: 'house-a-uuid',           // ← replace with real UUID
    name: 'ハウスA（トマト）',
    shortLabel: 'ハウスA',
    pinX: 20,
    pinY: 30,
    color: 'green',
  },
  {
    id: 'house-b-uuid',           // ← replace with real UUID
    name: 'ハウスB（きゅうり）',
    shortLabel: 'ハウスB',
    pinX: 65,
    pinY: 28,
    color: 'blue',
  },
  {
    id: 'field-a-uuid',           // ← replace with real UUID
    name: '露地畑A区画',
    shortLabel: '露地畑A',
    pinX: 38,
    pinY: 70,
    color: 'amber',
  },
  {
    id: 'house-c-uuid',           // ← replace with real UUID
    name: 'ハウスC（イチゴ）',
    shortLabel: 'ハウスC',
    pinX: 80,
    pinY: 68,
    color: 'rose',
  },
]

// ── Mock tasks ─────────────────────────────────────────────────
// Structured to match the `tasks` table columns exactly.
// `time_slot` is a display-only field — derive it from task creation time
// or store it in a future `scheduled_time` column.

function buildMockTasks(due: string): FarmTask[] {
  return [
    {
      id: 'task-1',
      house_id: 'house-a-uuid',
      house_name: 'ハウスA',
      task_description: 'トマトの誘引・整枝作業',
      time_slot: '09:00',
      due_date: due,
      status: 'pending',
    },
    {
      id: 'task-2',
      house_id: 'house-c-uuid',
      house_name: 'ハウスC',
      task_description: 'イチゴの収穫・選別',
      time_slot: '09:30',
      due_date: due,
      status: 'pending',
    },
    {
      id: 'task-3',
      house_id: 'house-b-uuid',
      house_name: 'ハウスB',
      task_description: 'きゅうりの収穫',
      time_slot: '10:30',
      due_date: due,
      status: 'pending',
    },
    {
      id: 'task-4',
      house_id: 'field-a-uuid',
      house_name: '露地畑A',
      task_description: '雑草除去・土壌管理',
      time_slot: '14:00',
      due_date: due,
      status: 'pending',
    },
    {
      id: 'task-5',
      house_id: 'house-a-uuid',
      house_name: 'ハウスA',
      task_description: '水やり・液肥散布',
      time_slot: '16:00',
      due_date: due,
      status: 'pending',
    },
  ]
}

// ── Page ───────────────────────────────────────────────────────

export default function HomePage() {
  const due = tomorrowISO()

  return (
    <FarmMapDashboard
      zones={MOCK_ZONES}
      tasks={buildMockTasks(due)}
      tomorrowLabel={tomorrowLabel()}
    />
  )
}
