'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Clock, AlertCircle, XCircle, Loader2, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { TodayBoardItem } from '@/types'
import { useTablet } from './tablet-context'

const SOURCE_TYPE_LABELS: Record<string, string> = {
  task: 'משימה',
  homework: 'שיעורי בית',
  lesson: 'שיעור',
  exam: 'מבחן',
  event: 'אירוע',
  parent_approval: 'אישור הורים',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  completed: 'בוצע',
  completed_pending_approval: 'ממתין לאישור',
  late: 'בוצע באיחור',
  missed: 'לא בוצע בזמן',
  approved: 'אושר',
  rejected: 'נדחה',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  completed: 'bg-green-100 text-green-700',
  completed_pending_approval: 'bg-yellow-100 text-yellow-700',
  late: 'bg-orange-100 text-orange-700',
  missed: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

interface Props {
  boardItem: TodayBoardItem
  /** child_id to use for proxy completion (points go to this child) */
  targetChildId: string | null
  onCompletionChange: () => void
}

export default function TabletItemCard({ boardItem, targetChildId, onCompletionChange }: Props) {
  const { item, completion, canComplete, canApprove } = boardItem
  const { requestPin } = useTablet()
  const [loading, setLoading] = useState(false)

  const status = completion?.status ?? 'pending'
  const isReadOnly = item.source_provider === 'mashov'
  const isLesson = item.source_type === 'lesson'
  const isExam = item.source_type === 'exam'
  const showNoAction = isReadOnly || isLesson || isExam

  async function handleComplete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/today/items/${item.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetChildId ? { target_child_id: targetChildId } : {}),
      })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error || 'שגיאה')
      } else {
        const body = await res.json()
        const c = body.completion
        if (c.points_awarded > 0) toast.success(`נוספו ${c.points_awarded} נקודות!`)
        else if (c.status === 'completed_pending_approval') toast.success('ממתין לאישור PIN')
        else toast.success('טופל!')
        onCompletionChange()
      }
    } finally {
      setLoading(false)
    }
  }

  async function doApprove() {
    setLoading(true)
    try {
      const res = await fetch(`/api/today/items/${item.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_id: completion?.id }),
      })
      if (!res.ok) toast.error('שגיאה באישור')
      else { toast.success('אושר!'); onCompletionChange() }
    } finally {
      setLoading(false)
    }
  }

  async function doReject() {
    setLoading(true)
    try {
      const res = await fetch(`/api/today/items/${item.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completion_id: completion?.id }),
      })
      if (!res.ok) toast.error('שגיאה בדחייה')
      else { toast.success('נדחה'); onCompletionChange() }
    } finally {
      setLoading(false)
    }
  }

  function handleApprove() {
    requestPin(() => doApprove())
  }

  function handleReject() {
    requestPin(() => doReject())
  }

  const isDone = ['completed', 'approved', 'late', 'missed'].includes(status)

  return (
    <div className={`rounded-xl border bg-white p-3 space-y-2 ${isDone ? 'opacity-50' : ''}`}>
      {/* Title + type badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-muted-foreground' : ''}`}>
            {item.subject || item.title}
          </p>
          {item.source_type === 'homework' && (item.description || item.title) && (
            <p className={`text-xs text-gray-700 mt-0.5 ${isDone ? 'line-through' : ''}`}>
              {item.description || item.title}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {SOURCE_TYPE_LABELS[item.source_type] || item.source_type}
        </Badge>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {item.teacher && <span>{item.teacher}</span>}
        {item.starts_at && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(item.starts_at), 'HH:mm')}
            {item.ends_at && `–${format(new Date(item.ends_at), 'HH:mm')}`}
          </span>
        )}
        {item.deadline_time && (
          <span className="text-orange-600 font-medium">עד {item.deadline_time.slice(0, 5)}</span>
        )}
      </div>

      {/* Points */}
      {item.reward_enabled && item.points_value > 0 && (
        <div className="text-xs text-green-600">+{item.points_value} נק׳</div>
      )}

      {/* Completion feedback */}
      {(completion?.penalty_applied ?? 0) > 0 && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> ירדו {completion!.penalty_applied} נקודות
        </p>
      )}
      {(completion?.points_awarded ?? 0) > 0 && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> נוספו {completion!.points_awarded} נקודות
        </p>
      )}

      {/* Status */}
      {completion && (
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[status] || ''}`}>
          {STATUS_LABELS[status] || status}
        </span>
      )}

      {/* Actions */}
      {!showNoAction && (
        <div className="flex gap-2 pt-1">
          {canComplete && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 flex-1 font-medium"
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                item.requires_parent_approval ? 'שלח לאישור' : 'סיימתי ✓'
              )}
            </Button>
          )}
          {status === 'completed_pending_approval' && (
            <span className="text-xs text-yellow-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> ממתין לאישור
            </span>
          )}
          {isDone && status !== 'completed_pending_approval' && (
            <span className="text-xs text-muted-foreground">טופל</span>
          )}
        </div>
      )}
    </div>
  )
}
