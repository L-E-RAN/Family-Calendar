'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2, EyeOff, BookOpen, Clock, MapPin, User,
  Calendar, Tag, Info, ExternalLink
} from 'lucide-react'
import type { CalendarItem, Profile } from '@/types'
import ItemTypeBadge from './item-type-badge'
import { toast } from 'sonner'

const PROVIDER_LABELS: Record<string, string> = {
  local: 'משימה מקומית',
  google_calendar: 'Google Calendar',
  mashov: 'משוב',
}

const SOURCE_LABELS: Record<string, string> = {
  task: 'משימה',
  event: 'אירוע',
  homework: 'שיעורי בית',
  lesson: 'שיעור',
  exam: 'מבחן',
  parent_approval: 'אישור הורה',
}

interface Props {
  item: CalendarItem
  profile: Profile
  onClose: () => void
  onUpdate: () => void
}

export default function ItemDrawer({ item, profile, onClose, onUpdate }: Props) {
  const [note, setNote] = useState(item.overlay?.notes || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const overlay = item.overlay
  const isDone = overlay?.local_status === 'completed' || item.status === 'completed'
  const isHidden = overlay?.local_status === 'hidden'
  const isAcknowledged = overlay?.local_status === 'acknowledged'
  const isMashov = item.source_provider === 'mashov'
  const isLocal = item.source_provider === 'local'
  const isParent = profile.role !== 'child'

  async function patchOverlay(payload: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/calendar/items/${item.id}/overlay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('שגיאה')
      toast.success('נשמר')
      onUpdate()
    } catch {
      toast.error('שגיאה בשמירה')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLocal() {
    if (!isLocal) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/calendar/local-tasks/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('נמחק')
      onUpdate()
    } catch {
      toast.error('שגיאה במחיקה')
    } finally {
      setDeleting(false)
    }
  }

  async function deleteGoogleEvent() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/calendar/google-events/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('נמחק מ-Google Calendar')
      onUpdate()
    } catch {
      toast.error('שגיאה במחיקה')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <SheetTitle className={`text-lg leading-snug ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                {item.title}
              </SheetTitle>
              <div className="flex flex-wrap gap-1 mt-2">
                <ItemTypeBadge type={item.source_type} />
                <Badge variant="outline" className="text-xs">
                  {PROVIDER_LABELS[item.source_provider] || item.source_provider}
                </Badge>
                {item.status === 'needs_action' && (
                  <Badge variant="destructive" className="text-xs">דורש פעולה</Badge>
                )}
              </div>
            </div>
            {item.child && (
              <div
                className="w-3 h-3 rounded-full mt-2 shrink-0"
                style={{ backgroundColor: item.child.color }}
                title={item.child.name}
              />
            )}
          </div>
        </SheetHeader>

        <div className="space-y-3 text-sm">
          {/* Child */}
          {item.child && (
            <Row icon={<User className="w-4 h-4" />} label="ילד" value={item.child.name} />
          )}

          {/* Date/time */}
          {item.starts_at && (
            <Row
              icon={<Clock className="w-4 h-4" />}
              label="זמן"
              value={
                item.all_day
                  ? format(new Date(item.starts_at), 'd בMMMM yyyy', { locale: he })
                  : `${format(new Date(item.starts_at), 'EEEE, d בMMMM yyyy HH:mm', { locale: he })}${item.ends_at ? ` – ${format(new Date(item.ends_at), 'HH:mm')}` : ''}`
              }
            />
          )}

          {/* Due date */}
          {item.due_at && !item.starts_at && (
            <Row
              icon={<Calendar className="w-4 h-4" />}
              label="הגשה"
              value={format(new Date(item.due_at), 'd בMMMM yyyy', { locale: he })}
            />
          )}

          {/* Subject */}
          {item.subject && (
            <Row icon={<BookOpen className="w-4 h-4" />} label="מקצוע" value={item.subject} />
          )}

          {/* Teacher */}
          {item.teacher && (
            <Row icon={<User className="w-4 h-4" />} label="מורה" value={item.teacher} />
          )}

          {/* Location */}
          {item.location && (
            <Row icon={<MapPin className="w-4 h-4" />} label="מיקום" value={item.location} />
          )}

          {/* Description */}
          {item.description && (
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">תיאור</p>
                <p className="text-sm whitespace-pre-wrap">{item.description}</p>
              </div>
            </div>
          )}

          {isMashov && (
            <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
              פריט זה מגיע ממשוב ואינו ניתן לעריכה מהאפליקציה
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Local note */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">הערה אישית</p>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="הוסף הערה..."
            rows={2}
            className="text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => patchOverlay({ notes: note, local_status: overlay?.local_status })}
          >
            שמור הערה
          </Button>
        </div>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!isDone && (
            <Button
              size="sm"
              variant="default"
              className="gap-1"
              disabled={saving}
              onClick={() => patchOverlay({ local_status: 'completed', notes: note })}
            >
              <CheckCircle2 className="w-4 h-4" />
              סיימתי
            </Button>
          )}
          {isDone && (
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => patchOverlay({ local_status: null, notes: note })}
            >
              בטל סימון
            </Button>
          )}

          {item.source_type === 'parent_approval' && !isAcknowledged && (
            <Button
              size="sm"
              variant="secondary"
              disabled={saving}
              onClick={() => patchOverlay({ local_status: 'acknowledged' })}
            >
              טופל
            </Button>
          )}

          {!isHidden && isParent && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-muted-foreground"
              disabled={saving}
              onClick={() => patchOverlay({ local_status: 'hidden' })}
            >
              <EyeOff className="w-4 h-4" />
              הסתר
            </Button>
          )}

          {isLocal && isParent && (
            <Button
              size="sm"
              variant="destructive"
              disabled={deleting}
              onClick={deleteLocal}
            >
              מחק משימה
            </Button>
          )}

          {item.source_provider === 'google_calendar' && item.is_editable && isParent && (
            <Button
              size="sm"
              variant="destructive"
              disabled={deleting}
              onClick={deleteGoogleEvent}
            >
              מחק מ-Google
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p>{value}</p>
      </div>
    </div>
  )
}
