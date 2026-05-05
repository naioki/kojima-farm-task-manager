import { FarmMapDashboard, type FarmZone, type FarmTask } from '@/components/FarmMapDashboard'
import { NFCScanButton } from '@/components/NFCScanButton'
import { clearRole } from '@/app/actions'

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
//     Run: SELECT id, name FROM public.houses;

const STAFF_ZONES: FarmZone[] = [
  {
    id: 'house-a-uuid',
    name: 'ハウスA（トマト）',
    shortLabel: 'ハウスA',
    pinX: 20,
    pinY: 30,
    color: 'green',
  },
  {
    id: 'house-b-uuid',
    name: 'ハウスB（きゅうり）',
    shortLabel: 'ハウスB',
    pinX: 65,
    pinY: 28,
    color: 'blue',
  },
  {
    id: 'field-a-uuid',
    name: '露地畑A区画',
    shortLabel: '露地畑A',
    pinX: 38,
    pinY: 70,
    color: 'amber',
  },
  {
    id: 'house-c-uuid',
    name: 'ハウスC（イチゴ）',
    shortLabel: 'ハウスC',
    pinX: 80,
    pinY: 68,
    color: 'rose',
  },
]

// ── Mock tasks ─────────────────────────────────────────────────
// TODO: Replace with Supabase query filtering by due_date = tomorrow and status = 'pending'

function buildStaffTasks(due: string): FarmTask[] {
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

// ── StaffDashboard ─────────────────────────────────────────────

/**
 * Wraps the FarmMapDashboard with staff-specific mock data.
 * The logout button floats over the green header in the top-right corner.
 */
export function StaffDashboard() {
  const due = tomorrowISO()

  return (
    <>
      <FarmMapDashboard
        zones={STAFF_ZONES}
        tasks={buildStaffTasks(due)}
        tomorrowLabel={tomorrowLabel()}
      />

      {/* NFC scan button — bottom-right, only visible on Android Chrome */}
      <NFCScanButton />

      {/* Logout button — floats over the FarmMapDashboard header */}
      <form action={clearRole} className="fixed right-4 top-3.5 z-50">
        <button
          type="submit"
          className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/30"
          aria-label="ログアウト"
        >
          ログアウト
        </button>
      </form>
    </>
  )
}
