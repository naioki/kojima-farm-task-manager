'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Clock, ArrowRight, X, ChevronRight } from 'lucide-react'

// ── Types (mirrors Supabase schema + display metadata) ─────────

export interface FarmZone {
  id: string          // Supabase houses.id — replace mocks with real UUIDs
  name: string        // Full display name (e.g. "ハウスA（トマト）")
  shortLabel: string  // Pin label (e.g. "ハウスA")
  pinX: number        // % from left within map container
  pinY: number        // % from top within map container
  color: 'green' | 'blue' | 'amber' | 'rose'
}

export interface FarmTask {
  id: string
  house_id: string            // FK → FarmZone.id
  house_name: string          // Denormalized for display
  task_description: string    // maps to tasks.task_description
  time_slot: string           // HH:MM display string (not in DB — set at creation time)
  due_date: string            // YYYY-MM-DD — maps to tasks.due_date
  status: 'pending' | 'completed'
}

interface FarmMapDashboardProps {
  zones: FarmZone[]
  tasks: FarmTask[]
  tomorrowLabel: string  // Formatted date string, e.g. "5月4日（日）"
}

// ── Zone colour palette ────────────────────────────────────────

const palette = {
  green: {
    pin:      'bg-green-600  border-green-700',
    selected: 'bg-orange-500 border-orange-600',
    badge:    'bg-green-100  text-green-800',
    dot:      'bg-green-500',
    icon:     'bg-green-600',
  },
  blue: {
    pin:      'bg-blue-600   border-blue-700',
    selected: 'bg-orange-500 border-orange-600',
    badge:    'bg-blue-100   text-blue-800',
    dot:      'bg-blue-500',
    icon:     'bg-blue-600',
  },
  amber: {
    pin:      'bg-amber-500  border-amber-600',
    selected: 'bg-orange-500 border-orange-600',
    badge:    'bg-amber-100  text-amber-800',
    dot:      'bg-amber-500',
    icon:     'bg-amber-500',
  },
  rose: {
    pin:      'bg-rose-500   border-rose-600',
    selected: 'bg-orange-500 border-orange-600',
    badge:    'bg-rose-100   text-rose-800',
    dot:      'bg-rose-500',
    icon:     'bg-rose-500',
  },
} as const

// ── HouseModal (bottom sheet) ──────────────────────────────────

function HouseModal({
  zone,
  tasks,
  onClose,
  onEnter,
}: {
  zone: FarmZone
  tasks: FarmTask[]
  onClose: () => void
  onEnter: () => void
}) {
  const c = palette[zone.color]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${zone.name}の詳細`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-2xl rounded-t-3xl bg-white shadow-2xl">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${c.icon}`}>
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{zone.name}</h3>
              <p className="text-xs text-gray-500">
                明日の作業 <span className="font-semibold text-gray-700">{tasks.length}件</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Task list */}
        <div className="max-h-52 overflow-y-auto px-5 py-3 space-y-2">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">明日の作業はありません</p>
          ) : (
            tasks.map(task => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3"
              >
                <Clock className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <span className="w-12 flex-shrink-0 font-mono text-xs text-gray-500">
                  {task.time_slot}
                </span>
                <span className="text-sm leading-snug text-gray-800">
                  {task.task_description}
                </span>
              </div>
            ))
          )}
        </div>

        {/* CTA */}
        <div className="px-5 py-4 pb-safe">
          <button
            onClick={onEnter}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-600 text-base font-bold text-white shadow-md transition-transform active:scale-[0.97]"
          >
            {zone.name}に入る
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── FarmMapDashboard ───────────────────────────────────────────

export function FarmMapDashboard({ zones, tasks, tomorrowLabel }: FarmMapDashboardProps) {
  const [selectedZone, setSelectedZone] = useState<FarmZone | null>(null)
  const router = useRouter()

  const handlePinClick = (zone: FarmZone) =>
    setSelectedZone(prev => (prev?.id === zone.id ? null : zone))

  const handleEnterHouse = (id: string) => router.push(`/house/${id}`)

  // Tasks sorted by time for the list view
  const sortedTasks = [...tasks].sort((a, b) => a.time_slot.localeCompare(b.time_slot))

  return (
    <div className="flex h-dvh flex-col bg-green-50">

      {/* ── Header ────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-green-700 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">🌱 農場ダッシュボード</h1>
            <p className="mt-0.5 text-xs text-green-200">明日の作業日: {tomorrowLabel}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-white">{tasks.length}</span>
            <p className="text-xs text-green-200">件の作業</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden">

        {/* ── Farm Map ──────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            農場マップ — ゾーンをタップ
          </p>

          <div
            className="relative w-full overflow-hidden rounded-2xl border-2 border-green-200 shadow-md"
            style={{
              aspectRatio: '16 / 7',
              background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 50%, #d9f99d 100%)',
            }}
          >
            {/* Grid overlay */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg,#166534 0,#166534 1px,transparent 0,transparent 40px),' +
                  'repeating-linear-gradient(90deg,#166534 0,#166534 1px,transparent 0,transparent 40px)',
                backgroundSize: '40px 40px',
              }}
              aria-hidden="true"
            />

            {/* Field boundary */}
            <div
              className="absolute inset-3 rounded-xl border border-dashed border-green-400 opacity-30"
              aria-hidden="true"
            />

            {/* Corner decoration */}
            {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map(pos => (
              <span key={pos} className={`absolute ${pos} text-base opacity-20`} aria-hidden="true">🌿</span>
            ))}

            {/* Zone Pins */}
            {zones.map(zone => {
              const taskCount = tasks.filter(t => t.house_id === zone.id).length
              const isSelected = selectedZone?.id === zone.id
              const c = palette[zone.color]

              return (
                <button
                  key={zone.id}
                  onClick={() => handlePinClick(zone)}
                  style={{ left: `${zone.pinX}%`, top: `${zone.pinY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                  aria-label={`${zone.name}を選択`}
                  aria-pressed={isSelected}
                >
                  {/* Circle */}
                  <div
                    className={`
                      relative flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg
                      transition-all duration-150 active:scale-90
                      ${isSelected ? c.selected + ' scale-110 ring-4 ring-orange-300/50' : c.pin}
                    `}
                  >
                    <MapPin className="h-6 w-6 text-white" />
                    {taskCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {taskCount}
                      </span>
                    )}
                  </div>
                  {/* Label */}
                  <span
                    className={`
                      whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold shadow-sm
                      ${isSelected ? 'bg-orange-500 text-white' : 'bg-white/90 text-gray-800'}
                    `}
                  >
                    {zone.shortLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Task List ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-gray-500">
            明日の全作業{' '}
            <span className="text-green-600">({sortedTasks.length}件)</span>
          </p>

          <div className="space-y-2.5">
            {sortedTasks.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
                明日の作業はありません
              </div>
            ) : (
              sortedTasks.map(task => {
                const zone = zones.find(z => z.id === task.house_id)
                const c = zone ? palette[zone.color] : null

                return (
                  <button
                    key={task.id}
                    onClick={() => zone && handlePinClick(zone)}
                    className="flex w-full items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.98]"
                  >
                    {/* Zone color dot */}
                    <div
                      className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${c?.dot ?? 'bg-gray-300'}`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-gray-900">
                        {task.task_description}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          {task.time_slot}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${c?.badge ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {task.house_name}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-300" />
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── House Detail Modal ────────────────────────────────── */}
      {selectedZone && (
        <HouseModal
          zone={selectedZone}
          tasks={tasks.filter(t => t.house_id === selectedZone.id)}
          onClose={() => setSelectedZone(null)}
          onEnter={() => handleEnterHouse(selectedZone.id)}
        />
      )}
    </div>
  )
}
