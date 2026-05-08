'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import heLocale from '@fullcalendar/core/locales/he'
import type { EventClickArg, EventInput } from '@fullcalendar/core'
import type { CalendarItem, Child, Profile, SourceProvider, SourceType } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, Plus, RefreshCw } from 'lucide-react'
import ItemDrawer from './item-drawer'
import CreateTaskDialog from './create-task-dialog'
import CreateEventDialog from './create-google-event-dialog'
import CalendarFilters from './calendar-filters'
import { toast } from 'sonner'

interface Props {
  profile: Profile
  children: Child[]
}

const SOURCE_TYPE_COLORS: Record<string, string> = {
  task: '#10b981',
  event: '#4285f4',
  homework: '#6366f1',
  lesson: '#94a3b8',
  exam: '#ef4444',
  parent_approval: '#f97316',
}

export default function CalendarView({ profile, children }: Props) {
  const calRef = useRef<FullCalendar>(null)
  const [items, setItems] = useState<CalendarItem[]>([])
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date } | null>(null)

  const [filters, setFilters] = useState({
    childIds: [] as string[],
    sources: [] as SourceProvider[],
    types: [] as SourceType[],
  })

  const fetchItems = useCallback(async (start: Date, end: Date) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      })
      filters.childIds.forEach(id => params.append('childIds', id))
      filters.sources.forEach(s => params.append('sources', s))
      filters.types.forEach(t => params.append('types', t))

      const res = await fetch(`/api/calendar/items?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setItems(data.items || [])
    } catch {
      toast.error('שגיאה בטעינת לוח השנה')
    } finally {
      setLoading(false)
    }
  }, [filters])

  function toFullCalendarEvents(items: CalendarItem[]): EventInput[] {
    return items.map(item => {
      const color = item.child?.color || SOURCE_TYPE_COLORS[item.source_type] || '#6366f1'
      const isDone = item.overlay?.local_status === 'completed' || item.status === 'completed'

      return {
        id: item.id,
        title: item.title,
        start: item.starts_at || item.due_at || undefined,
        end: item.ends_at || undefined,
        allDay: item.all_day || !item.starts_at,
        backgroundColor: isDone ? '#d1d5db' : color,
        borderColor: isDone ? '#9ca3af' : color,
        textColor: '#fff',
        extendedProps: { item },
        classNames: isDone ? ['opacity-60', 'line-through'] : [],
      }
    })
  }

  function handleEventClick(arg: EventClickArg) {
    const item = arg.event.extendedProps.item as CalendarItem
    setSelectedItem(item)
  }

  const isParent = profile.role !== 'child'

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b bg-white sticky top-0 z-10 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4 ml-1" />
          סינון
          {(filters.childIds.length + filters.sources.length + filters.types.length) > 0 && (
            <Badge variant="secondary" className="mr-1 h-4 text-xs">
              {filters.childIds.length + filters.sources.length + filters.types.length}
            </Badge>
          )}
        </Button>

        {loading && (
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        )}

        <div className="flex-1" />

        {isParent && (
          <>
            <Button size="sm" variant="outline" onClick={() => setShowCreateTask(true)}>
              <Plus className="w-4 h-4 ml-1" />
              משימה
            </Button>
            <Button size="sm" onClick={() => setShowCreateEvent(true)}>
              <Plus className="w-4 h-4 ml-1" />
              אירוע Google
            </Button>
          </>
        )}
      </div>

      {/* Filters bar */}
      {showFilters && (
        <CalendarFilters
          children={children}
          filters={filters}
          onChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Calendar */}
      <div className="flex-1 p-2 md:p-4 overflow-auto">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={heLocale}
          direction="rtl"
          firstDay={0}
          headerToolbar={{
            start: 'today prev,next',
            center: 'title',
            end: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          buttonText={{
            today: 'היום',
            month: 'חודש',
            week: 'שבוע',
            day: 'יום',
          }}
          events={toFullCalendarEvents(items)}
          eventClick={handleEventClick}
          datesSet={({ start, end }) => {
            setCurrentRange({ start, end })
            fetchItems(start, end)
          }}
          height="auto"
          dayMaxEvents={4}
          eventDisplay="block"
          nowIndicator
        />
      </div>

      {/* Item drawer */}
      {selectedItem && (
        <ItemDrawer
          item={selectedItem}
          profile={profile}
          onClose={() => setSelectedItem(null)}
          onUpdate={() => {
            setSelectedItem(null)
            if (currentRange) fetchItems(currentRange.start, currentRange.end)
          }}
        />
      )}

      {/* Create task dialog */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        children={children}
        onCreated={() => {
          setShowCreateTask(false)
          if (currentRange) fetchItems(currentRange.start, currentRange.end)
        }}
      />

      {/* Create Google event dialog */}
      <CreateEventDialog
        open={showCreateEvent}
        onOpenChange={setShowCreateEvent}
        onCreated={() => {
          setShowCreateEvent(false)
          if (currentRange) fetchItems(currentRange.start, currentRange.end)
        }}
      />
    </div>
  )
}
