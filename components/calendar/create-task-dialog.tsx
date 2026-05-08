'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Child } from '@/types'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: Child[]
  onCreated: () => void
}

export default function CreateTaskDialog({ open, onOpenChange, children, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [childId, setChildId] = useState<string>('family')
  const [dueAt, setDueAt] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [loading, setLoading] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)

  // Reward fields
  const [showReward, setShowReward] = useState(false)
  const [rewardEnabled, setRewardEnabled] = useState(false)
  const [pointsValue, setPointsValue] = useState(10)
  const [penaltyPoints, setPenaltyPoints] = useState(0)
  const [deadlineTime, setDeadlineTime] = useState('')
  const [requiresApproval, setRequiresApproval] = useState(false)

  function resetForm() {
    setTitle('')
    setDescription('')
    setChildId('family')
    setDueAt('')
    setPriority('normal')
    setIsRecurring(false)
    setShowReward(false)
    setRewardEnabled(false)
    setPointsValue(10)
    setPenaltyPoints(0)
    setDeadlineTime('')
    setRequiresApproval(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/calendar/local-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description || undefined,
          child_id: childId === 'family' ? undefined : childId,
          due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
          priority,
          visibility: 'family',
          is_recurring: isRecurring,
          reward_enabled: rewardEnabled,
          points_value: rewardEnabled ? pointsValue : 0,
          penalty_points: rewardEnabled ? penaltyPoints : 0,
          deadline_time: rewardEnabled && deadlineTime ? deadlineTime : null,
          requires_parent_approval: rewardEnabled ? requiresApproval : false,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success('משימה נוצרה')
      resetForm()
      onCreated()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה ביצירת משימה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>משימה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="task-title">כותרת *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="מה צריך לעשות?"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="task-desc">תיאור</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="פרטים נוספים..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>עבור</Label>
              <Select value={childId} onValueChange={(v) => setChildId(v ?? 'family')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">כל המשפחה</SelectItem>
                  {children.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>עדיפות</Label>
              <Select value={priority} onValueChange={(v) => setPriority((v as 'low' | 'normal' | 'high') ?? 'normal')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">נמוכה</SelectItem>
                  <SelectItem value="normal">רגילה</SelectItem>
                  <SelectItem value="high">גבוהה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="task-due">תאריך יעד</Label>
            <Input
              id="task-due"
              type="date"
              value={dueAt}
              onChange={e => setDueAt(e.target.value)}
              dir="ltr"
            />
          </div>

          {/* Recurring toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={e => setIsRecurring(e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-sm font-medium">משימה קבועה — תופיע מחדש כל יום</span>
          </label>

          {/* Reward section toggle */}
          <button
            type="button"
            onClick={() => setShowReward(v => !v)}
            className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium w-full text-right"
          >
            {showReward ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            הגדרות ניקוד וזמן מסך
          </button>

          {showReward && (
            <div className="border rounded-lg p-3 space-y-3 bg-indigo-50/50">
              {/* Enable toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rewardEnabled}
                  onChange={e => setRewardEnabled(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm font-medium">אפשר מערכת ניקוד</span>
              </label>

              {rewardEnabled && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="points-value">נקודות עבור ביצוע</Label>
                      <Input
                        id="points-value"
                        type="number"
                        min={0}
                        max={100}
                        value={pointsValue}
                        onChange={e => setPointsValue(Number(e.target.value))}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="penalty-points">קנס אי-ביצוע</Label>
                      <Input
                        id="penalty-points"
                        type="number"
                        min={0}
                        max={100}
                        value={penaltyPoints}
                        onChange={e => setPenaltyPoints(Number(e.target.value))}
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="deadline-time">שעת דדליין</Label>
                    <Input
                      id="deadline-time"
                      type="time"
                      value={deadlineTime}
                      onChange={e => setDeadlineTime(e.target.value)}
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">ביצוע לאחר שעה זו = איחור (ללא נקודות)</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiresApproval}
                      onChange={e => setRequiresApproval(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span className="text-sm">דורש אישור הורים לפני קבלת נקודות</span>
                  </label>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { resetForm(); onOpenChange(false) }}>ביטול</Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'יוצר...' : 'צור משימה'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
