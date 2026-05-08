'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { Plus, CheckCircle2, Circle, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { CalendarItem, Child, Profile } from '@/types'
import CreateTaskDialog from '@/components/calendar/create-task-dialog'
import EditTaskDialog from '@/components/calendar/edit-task-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  tasks: CalendarItem[]
  children: Child[]
  profile: Profile
}

export default function TasksView({ tasks: initialTasks, children, profile }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [showCreate, setShowCreate] = useState(false)
  const [editTask, setEditTask] = useState<CalendarItem | null>(null)
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active')
  const router = useRouter()
  const isParent = profile.role !== 'child'

  const filtered = tasks.filter(t => {
    const done = t.overlay?.local_status === 'completed' || t.status === 'completed'
    if (filter === 'active') return !done
    if (filter === 'completed') return done
    return true
  })

  async function toggleComplete(task: CalendarItem) {
    const done = task.overlay?.local_status === 'completed'
    const res = await fetch(`/api/calendar/items/${task.id}/overlay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_status: done ? null : 'completed' }),
    })
    if (res.ok) {
      setTasks(prev => prev.map(t => {
        if (t.id !== task.id) return t
        return { ...t, overlay: { ...t.overlay, local_status: done ? null : 'completed' } as CalendarItem['overlay'] }
      }))
    } else {
      toast.error('שגיאה')
    }
  }

  async function deleteTask(id: string) {
    const res = await fetch(`/api/calendar/local-tasks/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setTasks(prev => prev.filter(t => t.id !== id))
      toast.success('נמחק')
    } else {
      toast.error('שגיאה במחיקה')
    }
  }

  const PRIORITY_COLORS: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    normal: 'bg-blue-50 text-blue-700',
    low: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">משימות</h1>
        {isParent && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 ml-1" />
            משימה חדשה
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(['active', 'completed', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 text-sm py-1 rounded-md transition-colors ${filter === f ? 'bg-white shadow text-gray-900 font-medium' : 'text-gray-500'}`}
          >
            {f === 'active' ? 'פעילות' : f === 'completed' ? 'הושלמו' : 'הכל'}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map(task => {
          const done = task.overlay?.local_status === 'completed' || task.status === 'completed'
          return (
            <Card key={task.id} className={done ? 'opacity-60' : ''}>
              <CardContent className="p-3 flex items-start gap-3">
                <button onClick={() => toggleComplete(task)} className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${done ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {task.child && (
                      <Badge variant="outline" className="text-xs" style={{ borderColor: task.child.color }}>
                        {task.child.name}
                      </Badge>
                    )}
                    {task.source_type === 'homework' && (
                      <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200">
                        שיעורי בית
                      </Badge>
                    )}
                    {task.priority && task.priority !== 'normal' && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>
                        {task.priority === 'high' ? 'גבוה' : 'נמוך'}
                      </span>
                    )}
                    {task.due_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(task.due_at), 'd בMMMM', { locale: he })}
                      </span>
                    )}
                    {task.reward_enabled && task.points_value > 0 && (
                      <span className="text-xs text-green-600">+{task.points_value} נק׳</span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  )}
                </div>
                {isParent && task.source_type === 'task' && (
                  <div className="flex gap-1 shrink-0 mt-0.5">
                    <button
                      className="text-gray-400 hover:text-indigo-500"
                      onClick={() => setEditTask(task)}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <div className="text-4xl mb-3">✅</div>
          <p>{filter === 'completed' ? 'אין משימות שהושלמו' : 'אין משימות פעילות'}</p>
        </div>
      )}

      <CreateTaskDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        children={children}
        onCreated={() => {
          setShowCreate(false)
          router.refresh()
        }}
      />

      <EditTaskDialog
        task={editTask}
        open={!!editTask}
        onOpenChange={open => { if (!open) setEditTask(null) }}
        children={children}
        onUpdated={updated => {
          setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
          setEditTask(null)
        }}
      />
    </div>
  )
}
