'use client'

import { useState } from 'react'
import { Wrench, Plus, Check, Trash2, AlertCircle, RotateCcw } from 'lucide-react'
import type { HomeMaintenanceTask } from '@/types'
import { cn } from '@/lib/utils'
import { format, differenceInDays, isPast } from 'date-fns'
import { he } from 'date-fns/locale'

const AREAS = ['מטבח', 'סלון', 'חדרי שינה', 'חדר אמבטיה', 'מרפסת', 'מחסן', 'חצר', 'רכב', 'כללי']
const REPEAT_OPTIONS = [
  { value: '', label: 'ללא חזרה' },
  { value: '7 days', label: 'שבועי' },
  { value: '30 days', label: 'חודשי' },
  { value: '3 months', label: 'כל 3 חודשים' },
  { value: '6 months', label: 'כל חצי שנה' },
  { value: '1 year', label: 'שנתי' },
]

interface Props {
  initialTasks: HomeMaintenanceTask[]
}

export default function MaintenanceView({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<HomeMaintenanceTask[]>(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [form, setForm] = useState({ title: '', area: '', category: '', due_at: '', repeat_rule: '', notes: '' })

  const overdue = tasks.filter(t => t.status === 'active' && t.due_at && isPast(new Date(t.due_at)))
  const upcoming = tasks.filter(t => t.status === 'active' && (!t.due_at || !isPast(new Date(t.due_at))))
  const completed = tasks.filter(t => t.status === 'completed')

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { ...form, due_at: form.due_at ? new Date(form.due_at).toISOString() : undefined }
      const res = await fetch('/api/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (res.ok) {
        setTasks(prev => [...prev, data])
        setShowForm(false)
        setForm({ title: '', area: '', category: '', due_at: '', repeat_rule: '', notes: '' })
      }
    } finally { setSaving(false) }
  }

  async function completeTask(id: string) {
    const res = await fetch(`/api/maintenance/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) })
    const data = await res.json()
    if (res.ok) {
      setTasks(prev => prev.map(t => t.id === id ? data : t))
    }
  }

  async function deleteTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/maintenance/${id}`, { method: 'DELETE' })
  }

  return (
    <div dir="rtl" className="space-y-4">
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">{overdue.length} משימות באיחור</p>
            {overdue.slice(0, 2).map(t => <p key={t.id} className="text-xs text-red-700">{t.title}</p>)}
          </div>
        </div>
      )}

      <button
        onClick={() => setShowForm(v => !v)}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        הוסף משימת תחזוקה
      </button>

      {showForm && (
        <form onSubmit={addTask} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="תיאור המשימה *" required className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
              <option value="">אזור בבית</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={form.repeat_rule} onChange={e => setForm(f => ({ ...f, repeat_rule: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
              {REPEAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">תאריך יעד</label>
            <input type="date" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5" />
          </div>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות" rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">{saving ? 'שומר...' : 'שמור'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 border rounded-lg text-sm text-gray-600">ביטול</button>
          </div>
        </form>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <Section title="באיחור" tasks={overdue} onComplete={completeTask} onDelete={deleteTask} urgent />
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Section title="קרובות" tasks={upcoming} onComplete={completeTask} onDelete={deleteTask} />
      )}

      {overdue.length === 0 && upcoming.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">אין משימות תחזוקה</p>
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <button onClick={() => setShowCompleted(v => !v)} className="text-sm text-gray-500 flex items-center gap-1">
          <Check className="w-4 h-4" />
          {completed.length} הושלמו {showCompleted ? '▲' : '▼'}
        </button>
      )}
      {showCompleted && completed.map(t => (
        <TaskCard key={t.id} task={t} onComplete={completeTask} onDelete={deleteTask} done />
      ))}
    </div>
  )
}

function Section({ title, tasks, onComplete, onDelete, urgent }: {
  title: string; tasks: HomeMaintenanceTask[]; onComplete: (id: string) => void; onDelete: (id: string) => void; urgent?: boolean
}) {
  return (
    <div>
      <p className={cn('text-xs font-medium mb-2', urgent ? 'text-red-600' : 'text-gray-500')}>{title}</p>
      <div className="space-y-2">
        {tasks.map(t => <TaskCard key={t.id} task={t} onComplete={onComplete} onDelete={onDelete} />)}
      </div>
    </div>
  )
}

function TaskCard({ task, onComplete, onDelete, done }: {
  task: HomeMaintenanceTask; onComplete: (id: string) => void; onDelete: (id: string) => void; done?: boolean
}) {
  const isOverdue = task.due_at && isPast(new Date(task.due_at)) && !done
  const daysUntil = task.due_at ? differenceInDays(new Date(task.due_at), new Date()) : null

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border p-3 flex items-center gap-3', done && 'opacity-60')}>
      <div className={cn('p-2 rounded-lg shrink-0', isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600')}>
        <Wrench className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-gray-900', done && 'line-through text-gray-400')}>{task.title}</p>
        <div className="flex gap-2 text-xs text-gray-400">
          {task.area && <span>{task.area}</span>}
          {task.due_at && !done && (
            <span className={cn(isOverdue ? 'text-red-600 font-medium' : daysUntil !== null && daysUntil <= 7 ? 'text-orange-500' : '')}>
              {isOverdue ? `${Math.abs(daysUntil!)} ימי איחור` : daysUntil === 0 ? 'היום' : `${daysUntil} ימים`}
            </span>
          )}
          {task.repeat_rule && !done && <span><RotateCcw className="inline w-3 h-3" /> {task.repeat_rule}</span>}
          {done && task.last_completed_at && <span>הושלם {format(new Date(task.last_completed_at), 'd MMM', { locale: he })}</span>}
        </div>
      </div>
      {!done && (
        <button onClick={() => onComplete(task.id)} className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
      <button onClick={() => onDelete(task.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
