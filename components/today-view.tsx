'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { BookOpen, Clock, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CalendarItem, Profile } from '@/types'
import { toast } from 'sonner'
import ItemTypeBadge from './calendar/item-type-badge'

interface Props {
  profile: Profile
  lessons: CalendarItem[]
  homework: CalendarItem[]
  exams: CalendarItem[]
  approvals: CalendarItem[]
  tasks: CalendarItem[]
}

export default function TodayView({ profile, lessons, homework, exams, approvals, tasks }: Props) {
  const today = new Date()
  const dateStr = format(today, 'EEEE, d בMMMM yyyy', { locale: he })
  const isChild = profile.role === 'child'
  const isParent = profile.role !== 'child'

  const openHomework = homework.filter(h => h.overlay?.local_status !== 'completed' && h.status !== 'completed')
  const dueToday = openHomework.filter(h => {
    if (!h.due_at) return false
    const due = new Date(h.due_at)
    return due.toDateString() === today.toDateString()
  })

  async function markCompleted(item: CalendarItem) {
    const res = await fetch(`/api/calendar/items/${item.id}/overlay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_status: 'completed' }),
    })
    if (res.ok) toast.success('סומן כהושלם!')
    else toast.error('שגיאה בסימון')
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">היום שלי</h1>
        <p className="text-muted-foreground">{dateStr}</p>
      </div>

      {/* Parent approvals — top priority */}
      {isParent && approvals.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-4 h-4" />
              אישורי הורים ({approvals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {approvals.map(item => (
              <div key={item.id} className="bg-white rounded-lg p-3 border border-orange-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    {item.child && (
                      <p className="text-xs text-muted-foreground">עבור: {item.child.name}</p>
                    )}
                    {item.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                    )}
                    {item.starts_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(item.starts_at), 'd בMMMM', { locale: he })}
                      </p>
                    )}
                  </div>
                  <Badge variant="destructive" className="text-xs shrink-0">דורש פעולה</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Today's lessons */}
      {lessons.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              מערכת שעות היום ({lessons.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lessons.map(lesson => (
              <div key={lesson.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: lesson.child?.color || '#6366f1' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{lesson.subject || lesson.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {lesson.teacher && `${lesson.teacher} | `}
                    {lesson.location && `${lesson.location} | `}
                    {lesson.starts_at && format(new Date(lesson.starts_at), 'HH:mm')}
                    {lesson.ends_at && `–${format(new Date(lesson.ends_at), 'HH:mm')}`}
                  </p>
                </div>
                {lesson.child && (
                  <Badge variant="outline" className="text-xs" style={{ borderColor: lesson.child.color }}>
                    {lesson.child.name}
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Homework due today */}
      {dueToday.length > 0 && (
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <BookOpen className="w-4 h-4" />
              שיעורי בית להגשה היום ({dueToday.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueToday.map(item => (
              <HomeworkRow key={item.id} item={item} onComplete={markCompleted} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upcoming exams */}
      {exams.length > 0 && (
        <Card className="border-purple-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-purple-700">
              <AlertTriangle className="w-4 h-4" />
              מבחנים קרובים ({exams.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {exams.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.child?.color || '#a855f7' }}
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.subject} | {item.starts_at && format(new Date(item.starts_at), 'EEEE, d בMMMM', { locale: he })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Open homework */}
      {openHomework.length > 0 && openHomework.length !== dueToday.length && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              שיעורי בית פתוחים ({openHomework.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openHomework.filter(h => !dueToday.includes(h)).slice(0, 5).map(item => (
              <HomeworkRow key={item.id} item={item} onComplete={markCompleted} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active tasks */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-green-600" />
              משימות ({tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.child?.color || '#10b981' }}
                />
                <div className="flex-1">
                  <p className={`font-medium text-sm ${item.overlay?.local_status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {item.title}
                  </p>
                  {item.due_at && (
                    <p className="text-xs text-muted-foreground">
                      עד {format(new Date(item.due_at), 'd בMMMM', { locale: he })}
                    </p>
                  )}
                </div>
                {item.overlay?.local_status !== 'completed' && (
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => markCompleted(item)}>
                    סיימתי
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {lessons.length === 0 && openHomework.length === 0 && tasks.length === 0 && exams.length === 0 && approvals.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-lg font-medium">אין פריטים להיום</p>
          <p className="text-sm">תהנה מיום נינוח!</p>
        </div>
      )}
    </div>
  )
}

function HomeworkRow({ item, onComplete }: { item: CalendarItem; onComplete: (item: CalendarItem) => void }) {
  const done = item.overlay?.local_status === 'completed' || item.status === 'completed'
  return (
    <div className={`flex items-start gap-3 py-2 border-b last:border-0 ${done ? 'opacity-60' : ''}`}>
      <div
        className="w-3 h-3 rounded-full shrink-0 mt-1"
        style={{ backgroundColor: item.child?.color || '#6366f1' }}
      />
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${done ? 'line-through' : ''}`}>{item.title}</p>
        <p className="text-xs text-muted-foreground">
          {item.subject && `${item.subject} | `}
          {item.teacher}
          {item.due_at && ` | עד ${format(new Date(item.due_at), 'd/M')}`}
        </p>
      </div>
      {item.child && (
        <Badge variant="outline" className="text-xs shrink-0" style={{ borderColor: item.child.color }}>
          {item.child.name}
        </Badge>
      )}
      {!done && (
        <Button variant="ghost" size="sm" className="text-xs h-7 shrink-0" onClick={() => onComplete(item)}>
          <CheckCircle2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
