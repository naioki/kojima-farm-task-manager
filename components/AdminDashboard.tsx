'use client'

import { useState, useMemo } from 'react'
import { CheckCircle2, Clock, Filter, LogOut, MapPin } from 'lucide-react'
import { clearRole } from '@/app/actions'

// ── Types ──────────────────────────────────────────────────────

interface AdminTask {
  id: string
  house_id: string
  house_name: string
  task_description: string
  time_slot: string
  due_date: string             // YYYY-MM-DD — maps to tasks.due_date
  status: 'pending' | 'completed'
}

// ── Zone colour config (matches StaffDashboard / FarmMapDashboard) ──

const zoneConfig: Record<string, { badge: string; dot: string; label: string }> = {
  'house-a-uuid': { badge: 'bg-green-100 text-green-800',  dot: 'bg-green-500',  label: 'ハウスA' },
  'house-b-uuid': { badge: 'bg-blue-100  text-blue-800',   dot: 'bg-blue-500',   label: 'ハウスB' },
  'field-a-uuid': { badge: 'bg-amber-100 text-amber-800',  dot: 'bg-amber-500',  label: '露地畑A' },
  'house-c-uuid': { badge: 'bg-rose-100  text-rose-800',   dot: 'bg-rose-500',   label: 'ハウスC' },
}

// ── Mock tasks ─────────────────────────────────────────────────
// Covers yesterday / today / tomorrow with a mix of pending + completed.
// TODO: Replace with: supabase.from('tasks').select('*').order('due_date', { ascending: false })

function buildAdminTasks(): AdminTask[] {
  const jst = (offset: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
  }
  const yesterday = jst(-1)
  const today     = jst(0)
  const tomorrow  = jst(1)

  return [
    // ── Tomorrow ──────────────────────────────────
    { id: 't-01', house_id: 'house-a-uuid', house_name: 'ハウスA', task_description: 'トマトの誘引・整枝作業',    time_slot: '09:00', due_date: tomorrow,  status: 'pending'   },
    { id: 't-02', house_id: 'house-c-uuid', house_name: 'ハウスC', task_description: 'イチゴの収穫・選別',        time_slot: '09:30', due_date: tomorrow,  status: 'pending'   },
    { id: 't-03', house_id: 'house-b-uuid', house_name: 'ハウスB', task_description: 'きゅうりの収穫',            time_slot: '10:30', due_date: tomorrow,  status: 'pending'   },
    { id: 't-04', house_id: 'field-a-uuid', house_name: '露地畑A', task_description: '雑草除去・土壌管理',        time_slot: '14:00', due_date: tomorrow,  status: 'pending'   },
    { id: 't-05', house_id: 'house-a-uuid', house_name: 'ハウスA', task_description: '水やり・液肥散布',          time_slot: '16:00', due_date: tomorrow,  status: 'pending'   },
    // ── Today ─────────────────────────────────────
    { id: 't-06', house_id: 'house-a-uuid', house_name: 'ハウスA', task_description: '換気扇フィルター清掃',      time_slot: '07:00', due_date: today,     status: 'pending'   },
    { id: 't-07', house_id: 'house-b-uuid', house_name: 'ハウスB', task_description: '施肥（窒素系）',            time_slot: '11:00', due_date: today,     status: 'completed' },
    { id: 't-08', house_id: 'house-c-uuid', house_name: 'ハウスC', task_description: '病害虫定期チェック',        time_slot: '14:00', due_date: today,     status: 'completed' },
    { id: 't-09', house_id: 'field-a-uuid', house_name: '露地畑A', task_description: 'マルチシート張り替え',      time_slot: '15:00', due_date: today,     status: 'pending'   },
    // ── Yesterday ─────────────────────────────────
    { id: 't-10', house_id: 'house-b-uuid', house_name: 'ハウスB', task_description: 'ネット・支柱の修繕',        time_slot: '09:00', due_date: yesterday, status: 'completed' },
    { id: 't-11', house_id: 'field-a-uuid', house_name: '露地畑A', task_description: '収穫物の集荷・出荷準備',    time_slot: '08:30', due_date: yesterday, status: 'completed' },
    { id: 't-12', house_id: 'house-a-uuid', house_name: 'ハウスA', task_description: '温度・湿度センサー点検',    time_slot: '13:00', due_date: yesterday, status: 'pending'   },
  ]
}

// ── Sub-components ─────────────────────────────────────────────

function TaskRow({ task }: { task: AdminTask }) {
  const zone      = zoneConfig[task.house_id]
  const isPending = task.status === 'pending'

  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      {/* Status icon */}
      <div className="mt-0.5 flex-shrink-0">
        {isPending
          ? <Clock        className="h-4 w-4 text-amber-500" />
          : <CheckCircle2 className="h-4 w-4 text-green-500" />
        }
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium leading-snug ${
          isPending ? 'text-gray-900' : 'text-gray-400 line-through'
        }`}>
          {task.task_description}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            zone?.badge ?? 'bg-gray-100 text-gray-600'
          }`}>
            {zone?.label ?? task.house_name}
          </span>
          <span className="text-[11px] text-gray-400">{task.time_slot}</span>
          <span className="text-[11px] text-gray-400">{task.due_date}</span>
        </div>
      </div>

      {/* Status badge */}
      <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
      }`}>
        {isPending ? '未完了' : '完了'}
      </span>
    </div>
  )
}

// ── AdminDashboard ─────────────────────────────────────────────

export function AdminDashboard() {
  const allTasks = useMemo(() => buildAdminTasks(), [])

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [houseFilter,  setHouseFilter]  = useState<string>('all')

  const filtered = allTasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (houseFilter  !== 'all' && t.house_id !== houseFilter)  return false
    return true
  })

  const pendingCount   = allTasks.filter(t => t.status === 'pending').length
  const completedCount = allTasks.filter(t => t.status === 'completed').length

  return (
    <div className="flex h-dvh flex-col bg-gray-50">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-green-700 px-4 py-3 shadow-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">📋 タスク指令センター</h1>
            <p className="mt-0.5 text-xs text-green-200">管理者: Naoki</p>
          </div>
          <form action={clearRole}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-medium text-white hover:bg-white/30"
            >
              <LogOut className="h-3.5 w-3.5" />
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden">

        {/* ── Stats row ────────────────────────────────── */}
        <div className="flex-shrink-0 grid grid-cols-3 gap-3 p-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{allTasks.length}</p>
            <p className="mt-0.5 text-xs text-gray-500">合計タスク</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
            <p className="mt-0.5 text-xs text-gray-500">未完了</p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="mt-0.5 text-xs text-gray-500">完了</p>
          </div>
        </div>

        {/* ── Filter row ───────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center gap-2 px-4 pb-3">
          <Filter className="h-4 w-4 flex-shrink-0 text-gray-400" />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'pending' | 'completed')}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-green-400 focus:outline-none"
          >
            <option value="all">すべてのステータス</option>
            <option value="pending">未完了のみ</option>
            <option value="completed">完了のみ</option>
          </select>

          <select
            value={houseFilter}
            onChange={e => setHouseFilter(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-green-400 focus:outline-none"
          >
            <option value="all">全エリア</option>
            {Object.entries(zoneConfig).map(([id, z]) => (
              <option key={id} value={id}>{z.label}</option>
            ))}
          </select>
        </div>

        {/* ── Task list ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filtered.length} / {allTasks.length} 件表示
            </p>
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <MapPin className="h-3 w-3" />
              <span>各エリアのハウスページへ移動可</span>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
                条件に一致するタスクがありません
              </div>
            ) : (
              filtered.map(task => <TaskRow key={task.id} task={task} />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
