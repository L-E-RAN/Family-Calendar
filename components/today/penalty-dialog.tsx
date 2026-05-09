'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  childId: string
  childName: string
  onSuccess: () => void
}

export default function PenaltyDialog({ open, onOpenChange, childId, childName, onSuccess }: Props) {
  const [taskName, setTaskName] = useState('')
  const [points, setPoints] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTaskName('')
    setPoints('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const pts = parseInt(points, 10)
    if (!taskName.trim() || isNaN(pts) || pts <= 0) {
      setError('יש למלא שם משימה ומספר נקודות תקין')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/today/penalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, task_name: taskName, points: pts }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'שגיאה בשמירה')
        return
      }
      reset()
      onOpenChange(false)
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>הורדת נקודות</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label htmlFor="child-name">שם הילד</Label>
            <Input id="child-name" value={childName} readOnly className="bg-muted" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="task-name">שם המשימה</Label>
            <Input
              id="task-name"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              placeholder="לדוגמה: לא סידר חדר"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="points">נקודות להורדה</Label>
            <Input
              id="points"
              type="number"
              min={1}
              value={points}
              onChange={e => setPoints(e.target.value)}
              placeholder="0"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false) }}>
              ביטול
            </Button>
            <Button type="submit" disabled={loading} variant="destructive">
              {loading ? 'שומר...' : 'הורד נקודות'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
