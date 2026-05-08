'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { X, Clock, CheckCircle2, AlertCircle, Lock, Loader2 } from 'lucide-react'
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

interface Props {
  boardItem: TodayBoardItem
  targetChildId: string | null
  childName: string
  childColor: string
  onCompletionChange: () => void
  onClose: () => void
}

export default function TabletTaskDialog({
  boardItem,
  targetChildId,
  childName,
  childColor,
  onCompletionChange,
  onClose,
}: Props) {
  const { item, completion, canComplete, canApprove } = boardItem
  const { requestPin } = useTablet()
  const [loading, setLoading] = useState(false)

  const status = completion?.status ?? 'pending'
  const isDone = ['completed', 'approved', 'late', 'missed'].includes(status)
  const isPendingApproval = status === 'completed_pending_approval'
  const isReadOnly = (item.source_provider === 'mashov' && item.source_type !== 'homework')
    || item.source_type === 'lesson'
    || item.source_type === 'exam'

  async function handleComplete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/today/items/${item.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(targetChildId ? { target_child_id: targetChildId } : {}),
          tablet_mode: true,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error || 'שגיאה')
      } else {
        const body = await res.json()
        const c = body.completion
        if (c.points_awarded > 0) toast.success(`${childName} קיבל/ה ${c.points_awarded} נקודות!`)
        else if (c.status === 'completed_pending_approval') {
          // Stay open so parent can approve immediately with PIN
          onCompletionChange()
        } else {
          toast.success('בוצע!')
          onCompletionChange()
          onClose()
        }
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
      else {
        toast.success('אושר! נקודות נוספו')
        onCompletionChange()
        onClose()
      }
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
      else { toast.success('נדחה'); onCompletionChange(); onClose() }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: childColor }}
              >
                {childName}
              </span>
              <span className="text-xs text-gray-500 border rounded-full px-2 py-0.5">
                {SOURCE_TYPE_LABELS[item.source_type] || item.source_type}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">
              {item.subject || item.title}
            </h2>
            {item.source_type === 'homework' && item.description && (
              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1 shrink-0">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          {item.teacher && <span>מורה: {item.teacher}</span>}
          {item.starts_at && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(item.starts_at), 'HH:mm')}
              {item.ends_at && `–${format(new Date(item.ends_at), 'HH:mm')}`}
            </span>
          )}
          {item.deadline_time && (
            <span className="text-orange-600 font-medium">עד {item.deadline_time.slice(0, 5)}</span>
          )}
          {item.due_at && !item.starts_at && (
            <span>עד {format(new Date(item.due_at), 'd/M')}</span>
          )}
        </div>

        {/* Points */}
        {item.reward_enabled && item.points_value > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-center">
            <p className="text-2xl font-bold text-green-600">+{item.points_value}</p>
            <p className="text-xs text-green-700">נקודות בסיום</p>
          </div>
        )}

        {/* Current status */}
        {completion && (
          <div className={`rounded-xl px-4 py-3 text-center font-medium ${
            isDone ? 'bg-green-50 text-green-700' :
            isPendingApproval ? 'bg-yellow-50 text-yellow-700' :
            'bg-gray-50 text-gray-600'
          }`}>
            {isDone && <CheckCircle2 className="w-5 h-5 inline ml-2" />}
            {isPendingApproval && <AlertCircle className="w-5 h-5 inline ml-2" />}
            {STATUS_LABELS[status] || status}
            {(completion.points_awarded ?? 0) > 0 && ` · +${completion.points_awarded} נק׳`}
          </div>
        )}

        {/* Actions */}
        {!isReadOnly && (
          <div className="space-y-3">
            {canComplete && (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white text-xl font-bold transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ backgroundColor: childColor }}
              >
                {loading
                  ? <Loader2 className="w-6 h-6 animate-spin" />
                  : item.requires_parent_approval
                    ? '📤 שלח לאישור'
                    : '✓ סיימתי!'
                }
              </button>
            )}

            {canApprove && (
              <div className="flex gap-3">
                <button
                  onClick={() => requestPin(() => doApprove())}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-green-500 text-white font-bold text-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  <Lock className="w-4 h-4" />
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'אשר ✓'}
                </button>
                <button
                  onClick={() => requestPin(() => doReject())}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-red-100 text-red-600 font-bold text-lg flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  <Lock className="w-4 h-4" />
                  דחה ✗
                </button>
              </div>
            )}

            {isPendingApproval && !canApprove && (
              <div className="text-center text-yellow-600 text-sm flex items-center justify-center gap-2 py-2">
                <AlertCircle className="w-4 h-4" />
                ממתין לאישור הורים (נדרש PIN)
              </div>
            )}
          </div>
        )}

        {isReadOnly && (
          <p className="text-center text-sm text-gray-400">לא ניתן לסמן פריט זה</p>
        )}
      </div>
    </div>
  )
}
