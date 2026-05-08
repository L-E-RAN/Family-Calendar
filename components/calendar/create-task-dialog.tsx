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
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success('משימה נוצרה')
      setTitle('')
      setDescription('')
      setChildId('family')
      setDueAt('')
      onCreated()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה ביצירת משימה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
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
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? 'יוצר...' : 'צור משימה'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
