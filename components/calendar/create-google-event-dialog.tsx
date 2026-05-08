'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export default function CreateEventDialog({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !startDate) return
    setLoading(true)
    try {
      const startsAt = allDay ? `${startDate}T00:00:00+02:00` : `${startDate}T${startTime}:00+02:00`
      const endsAt = allDay
        ? `${endDate || startDate}T23:59:00+02:00`
        : `${endDate || startDate}T${endTime}:00+02:00`

      const res = await fetch('/api/calendar/google-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description || undefined,
          location: location || undefined,
          starts_at: startsAt,
          ends_at: endsAt,
          all_day: allDay,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      toast.success('אירוע נוצר ב-Google Calendar')
      setTitle('')
      setDescription('')
      setLocation('')
      setStartDate('')
      setEndDate('')
      onCreated()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה ביצירת אירוע')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>אירוע חדש ב-Google Calendar</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="event-title">כותרת *</Label>
            <Input
              id="event-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="שם האירוע"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="all-day"
              checked={allDay}
              onChange={e => setAllDay(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="all-day">כל היום</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>תחילה *</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} dir="ltr" required />
              {!allDay && (
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} dir="ltr" />
              )}
            </div>
            <div className="space-y-1">
              <Label>סיום</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} dir="ltr" />
              {!allDay && (
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} dir="ltr" />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="event-location">מיקום</Label>
            <Input
              id="event-location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="איפה?"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="event-desc">תיאור</Label>
            <Textarea
              id="event-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>ביטול</Button>
            <Button type="submit" disabled={loading || !title.trim() || !startDate}>
              {loading ? 'יוצר...' : 'צור אירוע'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
