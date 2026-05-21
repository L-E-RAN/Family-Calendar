import { createClient } from '@/lib/supabase/server'
import PetsView from '@/components/pets/pets-view'
import type { Pet, PetEvent } from '@/types'

export default async function PetsPage() {
  const supabase = await createClient()

  const [petsRes, eventsRes] = await Promise.all([
    supabase.from('pets').select('*').order('name', { ascending: true }),
    supabase.from('pet_events').select('*').order('due_at', { ascending: true }).order('event_date', { ascending: false }),
  ])

  const pets = (petsRes.data ?? []) as Pet[]
  const events = (eventsRes.data ?? []) as PetEvent[]

  return (
    <div className="p-4 max-w-lg mx-auto" dir="rtl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">צ׳ארלי</h1>
        <p className="text-sm text-muted-foreground">טיפול בחיות המחמד</p>
      </div>
      <PetsView initialPets={pets} initialEvents={events} />
    </div>
  )
}
