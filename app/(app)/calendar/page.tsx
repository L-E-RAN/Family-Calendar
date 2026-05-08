import { createClient } from '@/lib/supabase/server'
import CalendarView from '@/components/calendar/calendar-view'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single()

  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', profile!.family_id)
    .eq('active', true)
    .order('name')

  return <CalendarView profile={profile!} children={children || []} />
}
