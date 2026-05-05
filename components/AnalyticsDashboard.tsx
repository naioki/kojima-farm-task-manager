'use client'

// ── Types ──────────────────────────────────────────────────────

interface AdminTask {
  id: string
  house_id: string
  house_name: string
  task_description: string
  time_slot: string
  due_date: string
  status: 'pending' | 'completed'
}

interface AnalyticsDashboardProps {
  tasks: AdminTask[]
}

// ── Zone config (shared label/colour definition) ────────────────

const ZONES: { id: string; label: string; color: string; barColor: string }[] = [
  { id: 'house-a-uuid', label: 'ハウスA', color: 'bg-green-500',  barColor: '#22c55e' },
  { id: 'house-b-uuid', label: 'ハウスB', color: 'bg-blue-500',   barColor: '#3b82f6' },
  { id: 'field-a-uuid', label: '露地畑A', color: 'bg-amber-500',  barColor: '#f59e0b' },
  { id: 'house-c-uuid', label: 'ハウスC', color: 'bg-rose-500',   barColor: '#f43f5e' },
]

// ── Completion Ring (SVG donut chart) ───────────────────────────

function CompletionRing({ completed, total }: { completed: number; total: number }) {
  const pct    = total === 0 ? 0 : Math.round((completed / total) * 100)
  const radius = 40
  const circ   = 2 * Math.PI * radius
  const dash   = (pct / 100) * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        {/* Track */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
        />
        {/* Progress */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="#16a34a"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-800">{pct}%</p>
      </div>
      <p className="text-xs text-gray-500">{completed} / {total} 件完了</p>
    </div>
  )
}

// ── Zone Bar Chart ───────────────────────────────────────────────

function ZoneBarChart({ tasks }: { tasks: AdminTask[] }) {
  return (
    <div className="space-y-2.5">
      {ZONES.map(zone => {
        const zoneTasks    = tasks.filter(t => t.house_id === zone.id)
        const total        = zoneTasks.length
        const completed    = zoneTasks.filter(t => t.status === 'completed').length
        const completedPct = total === 0 ? 0 : Math.round((completed / total) * 100)

        return (
          <div key={zone.id}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-gray-700 font-medium">
                <span className={`h-2 w-2 rounded-full ${zone.color}`} />
                {zone.label}
              </span>
              <span className="text-gray-400">{completed}/{total}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${completedPct}%`,
                  backgroundColor: zone.barColor,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Status Breakdown ────────────────────────────────────────────

function StatusBreakdown({ tasks }: { tasks: AdminTask[] }) {
  const counts = {
    pending:   tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  }

  const rows: { label: string; count: number; color: string; bg: string }[] = [
    { label: '未完了',  count: counts.pending,   color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: '完了',    count: counts.completed, color: 'text-green-600', bg: 'bg-green-100' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map(row => (
        <div key={row.label} className={`rounded-2xl ${row.bg} p-3 text-center`}>
          <p className={`text-2xl font-bold ${row.color}`}>{row.count}</p>
          <p className="mt-0.5 text-xs text-gray-600">{row.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Due Date Timeline ────────────────────────────────────────────

function DueDateTimeline({ tasks }: { tasks: AdminTask[] }) {
  // Group tasks by due_date, sorted chronologically
  const grouped = tasks.reduce<Record<string, AdminTask[]>>((acc, t) => {
    const key = t.due_date || '日付なし'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })

  const sorted = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))

  const dateLabel = (d: string) => {
    if (d === '日付なし') return d
    if (d === today) return `今日 (${d})`
    const diff = Math.round(
      (new Date(d).getTime() - new Date(today).getTime()) / 86_400_000,
    )
    if (diff === 1)  return `明日 (${d})`
    if (diff === -1) return `昨日 (${d})`
    return d
  }

  return (
    <div className="space-y-3">
      {sorted.map(([date, dateTasks]) => {
        const pending   = dateTasks.filter(t => t.status === 'pending').length
        const completed = dateTasks.filter(t => t.status === 'completed').length
        return (
          <div key={date} className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700">{dateLabel(date)}</p>
              <div className="flex gap-2 text-[11px]">
                {pending > 0 && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                    未完了 {pending}
                  </span>
                )}
                {completed > 0 && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                    完了 {completed}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── AnalyticsDashboard ─────────────────────────────────────────

export function AnalyticsDashboard({ tasks }: AnalyticsDashboardProps) {
  const completedCount = tasks.filter(t => t.status === 'completed').length

  return (
    <div className="space-y-6 px-4 pb-6 pt-4">

      {/* Completion overview */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-gray-700">📊 完了率</h2>
        <div className="flex items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="relative flex flex-col items-center">
            <CompletionRing completed={completedCount} total={tasks.length} />
          </div>
        </div>
      </section>

      {/* Status breakdown */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-gray-700">📋 ステータス内訳</h2>
        <StatusBreakdown tasks={tasks} />
      </section>

      {/* Zone progress bars */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-gray-700">🏠 エリア別進捗</h2>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <ZoneBarChart tasks={tasks} />
        </div>
      </section>

      {/* Due date timeline */}
      <section>
        <h2 className="mb-3 text-sm font-bold text-gray-700">📅 日付別タイムライン</h2>
        <DueDateTimeline tasks={tasks} />
      </section>
    </div>
  )
}
