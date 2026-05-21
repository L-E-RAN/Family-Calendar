'use client'

import { useState } from 'react'
import {
  PawPrint, Plus, Syringe, Pill, Stethoscope, Scissors,
  Scale, Check, Trash2, ChevronRight, AlertCircle
} from 'lucide-react'
import type { Pet, PetEvent, PetEventType } from '@/types'
import { cn } from '@/lib/utils'
import { format, differenceInDays, differenceInYears, differenceInMonths } from 'date-fns'
import { he } from 'date-fns/locale'

const EVENT_META: Record<PetEventType, { label: string; icon: React.ElementType; color: string }> = {
  vaccine:    { label: 'חיסון',     icon: Syringe,      color: 'bg-blue-100 text-blue-600' },
  medication: { label: 'תרופה',     icon: Pill,         color: 'bg-purple-100 text-purple-600' },
  vet_visit:  { label: "וטרינר",    icon: Stethoscope,  color: 'bg-red-100 text-red-600' },
  grooming:   { label: 'טיפוח',     icon: Scissors,     color: 'bg-pink-100 text-pink-600' },
  weight:     { label: 'משקל',      icon: Scale,        color: 'bg-gray-100 text-gray-600' },
  food:       { label: 'אוכל',      icon: PawPrint,     color: 'bg-green-100 text-green-600' },
  walk:       { label: 'טיול',      icon: PawPrint,     color: 'bg-teal-100 text-teal-600' },
  other:      { label: 'אחר',       icon: PawPrint,     color: 'bg-gray-100 text-gray-500' },
}

interface Props {
  initialPets: Pet[]
  initialEvents: PetEvent[]
}

function petAge(birthDate: string) {
  const birth = new Date(birthDate)
  const years = differenceInYears(new Date(), birth)
  if (years >= 1) return `${years} שנ'`
  const months = differenceInMonths(new Date(), birth)
  return `${months} חודשים`
}

export default function PetsView({ initialPets, initialEvents }: Props) {
  const [pets, setPets] = useState<Pet[]>(initialPets)
  const [events, setEvents] = useState<PetEvent[]>(initialEvents)
  const [activePetId, setActivePetId] = useState<string | null>(initialPets[0]?.id ?? null)
  const [showAddPet, setShowAddPet] = useState(false)
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [petForm, setPetForm] = useState({ name: '', type: 'dog', breed: '', birth_date: '', notes: '' })
  const [eventForm, setEventForm] = useState({ type: 'other' as PetEventType, title: '', event_date: '', due_at: '', repeat_rule: '', notes: '' })

  const activePet = pets.find(p => p.id === activePetId)
  const petEvents = events.filter(e => e.pet_id === activePetId)
  const dueEvents = petEvents.filter(e => e.status === 'active' && e.due_at && new Date(e.due_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  const pastEvents = petEvents.filter(e => e.status === 'completed')
  const activeEvents = petEvents.filter(e => e.status === 'active')

  async function addPet(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/pets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(petForm) })
      const data = await res.json()
      if (res.ok) {
        setPets(prev => [...prev, data])
        setActivePetId(data.id)
        setShowAddPet(false)
        setPetForm({ name: '', type: 'dog', breed: '', birth_date: '', notes: '' })
      }
    } finally { setSaving(false) }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault()
    if (!activePetId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/pets/${activePetId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      })
      const data = await res.json()
      if (res.ok) {
        setEvents(prev => [data, ...prev])
        setShowAddEvent(false)
        setEventForm({ type: 'other', title: '', event_date: '', due_at: '', repeat_rule: '', notes: '' })
      }
    } finally { setSaving(false) }
  }

  async function completeEvent(id: string) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'completed' } : e))
    await fetch(`/api/pets/events/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) })
  }

  async function deleteEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id))
    await fetch(`/api/pets/events/${id}`, { method: 'DELETE' })
  }

  if (pets.length === 0 && !showAddPet) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center" dir="rtl">
        <PawPrint className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">אין חיות מחמד</p>
        <button onClick={() => setShowAddPet(true)} className="bg-indigo-600 text-white rounded-xl px-6 py-3 font-medium">
          הוסף חיית מחמד
        </button>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Pet tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {pets.map(pet => (
          <button
            key={pet.id}
            onClick={() => setActivePetId(pet.id)}
            className={cn('shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
              activePetId === pet.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
            )}
          >
            <PawPrint className="w-4 h-4" />
            {pet.name}
          </button>
        ))}
        <button onClick={() => setShowAddPet(v => !v)} className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-sm text-gray-500 border border-dashed">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {showAddPet && (
        <form onSubmit={addPet} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <h3 className="font-medium text-gray-800">חיית מחמד חדשה</h3>
          <input value={petForm.name} onChange={e => setPetForm(f => ({ ...f, name: e.target.value }))} placeholder="שם *" required className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={petForm.breed} onChange={e => setPetForm(f => ({ ...f, breed: e.target.value }))} placeholder="גזע" className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={petForm.birth_date} onChange={e => setPetForm(f => ({ ...f, birth_date: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">{saving ? 'שומר...' : 'שמור'}</button>
            <button type="button" onClick={() => setShowAddPet(false)} className="px-4 border rounded-lg text-sm text-gray-600">ביטול</button>
          </div>
        </form>
      )}

      {/* Pet profile */}
      {activePet && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 flex items-center gap-4 border">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm">🐩</div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{activePet.name}</h2>
            <p className="text-sm text-gray-600">{activePet.breed ?? activePet.type}</p>
            {activePet.birth_date && <p className="text-xs text-gray-500">גיל: {petAge(activePet.birth_date)}</p>}
          </div>
          {dueEvents.length > 0 && (
            <div className="mr-auto flex items-center gap-1 bg-orange-100 text-orange-700 rounded-full px-3 py-1 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {dueEvents.length} תזכורות
            </div>
          )}
        </div>
      )}

      {/* Add event */}
      <button
        onClick={() => setShowAddEvent(v => !v)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        הוסף אירוע
      </button>

      {showAddEvent && (
        <form onSubmit={addEvent} className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <h3 className="font-medium text-gray-800">אירוע חדש</h3>
          <div className="grid grid-cols-2 gap-2">
            <select value={eventForm.type} onChange={e => setEventForm(f => ({ ...f, type: e.target.value as PetEventType }))} className="border rounded-lg px-3 py-2 text-sm">
              {Object.entries(EVENT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))} placeholder="כותרת *" required className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">תאריך</label>
              <input type="date" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5" />
            </div>
            <div>
              <label className="text-xs text-gray-500">תזכורת לתאריך</label>
              <input type="datetime-local" value={eventForm.due_at} onChange={e => setEventForm(f => ({ ...f, due_at: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5" />
            </div>
          </div>
          <input value={eventForm.notes} onChange={e => setEventForm(f => ({ ...f, notes: e.target.value }))} placeholder="הערות" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">{saving ? 'שומר...' : 'שמור'}</button>
            <button type="button" onClick={() => setShowAddEvent(false)} className="px-4 border rounded-lg text-sm text-gray-600">ביטול</button>
          </div>
        </form>
      )}

      {/* Events list */}
      {activeEvents.length === 0 && pastEvents.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">אין אירועים עדיין</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeEvents.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-500">פעיל</p>
              {activeEvents.map(ev => (
                <EventCard key={ev.id} event={ev} onComplete={completeEvent} onDelete={deleteEvent} />
              ))}
            </>
          )}
          {pastEvents.length > 0 && (
            <>
              <p className="text-xs font-medium text-gray-500 mt-3">היסטוריה</p>
              {pastEvents.slice(0, 5).map(ev => (
                <EventCard key={ev.id} event={ev} onComplete={completeEvent} onDelete={deleteEvent} done />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function EventCard({ event, onComplete, onDelete, done }: { event: PetEvent; onComplete: (id: string) => void; onDelete: (id: string) => void; done?: boolean }) {
  const meta = EVENT_META[event.type]
  const Icon = meta.icon
  const isDue = event.due_at && new Date(event.due_at) <= new Date() && !done
  const daysUntil = event.due_at ? differenceInDays(new Date(event.due_at), new Date()) : null

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border p-3 flex items-center gap-3', done && 'opacity-60')}>
      <div className={cn('p-2 rounded-lg shrink-0', meta.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium text-gray-900', done && 'line-through text-gray-400')}>{event.title}</p>
        <div className="flex gap-2 text-xs text-gray-400">
          <span>{meta.label}</span>
          {event.due_at && !done && (
            <span className={cn(isDue ? 'text-orange-600 font-medium' : '')}>
              {isDue ? '⚠️ פג' : daysUntil !== null && daysUntil <= 7 ? `${daysUntil}ד` : format(new Date(event.due_at), 'd MMM', { locale: he })}
            </span>
          )}
          {event.event_date && done && <span>{format(new Date(event.event_date), 'd MMM', { locale: he })}</span>}
        </div>
      </div>
      {!done && (
        <button onClick={() => onComplete(event.id)} className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
      <button onClick={() => onDelete(event.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
