'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Child, SourceProvider, SourceType } from '@/types'

const SOURCES: { value: SourceProvider; label: string }[] = [
  { value: 'local', label: 'משימות מקומיות' },
  { value: 'google_calendar', label: 'Google Calendar' },
  { value: 'mashov', label: 'משוב' },
]

const TYPES: { value: SourceType; label: string }[] = [
  { value: 'task', label: 'משימה' },
  { value: 'event', label: 'אירוע' },
  { value: 'homework', label: 'שיעורי בית' },
  { value: 'lesson', label: 'שיעור' },
  { value: 'exam', label: 'מבחן' },
  { value: 'parent_approval', label: 'אישור הורה' },
]

interface Filters {
  childIds: string[]
  sources: SourceProvider[]
  types: SourceType[]
}

interface Props {
  children: Child[]
  filters: Filters
  onChange: (f: Filters) => void
  onClose: () => void
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

export default function CalendarFilters({ children, filters, onChange, onClose }: Props) {
  const activeCount = filters.childIds.length + filters.sources.length + filters.types.length

  return (
    <div className="p-3 border-b bg-gray-50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">סינון</p>
        <div className="flex gap-2">
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => onChange({ childIds: [], sources: [], types: [] })}
            >
              נקה הכל
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {children.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">ילד</p>
          <div className="flex flex-wrap gap-1.5">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => onChange({ ...filters, childIds: toggle(filters.childIds, child.id) })}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                  filters.childIds.includes(child.id)
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
                style={filters.childIds.includes(child.id) ? { backgroundColor: child.color, borderColor: child.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: child.color }}
                />
                {child.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-muted-foreground mb-1.5">מקור</p>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map(s => (
            <Badge
              key={s.value}
              variant={filters.sources.includes(s.value) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => onChange({ ...filters, sources: toggle(filters.sources, s.value) })}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1.5">סוג</p>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(t => (
            <Badge
              key={t.value}
              variant={filters.types.includes(t.value) ? 'default' : 'outline'}
              className="cursor-pointer text-xs"
              onClick={() => onChange({ ...filters, types: toggle(filters.types, t.value) })}
            >
              {t.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
