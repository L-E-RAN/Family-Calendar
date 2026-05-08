import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ScreenTimeTiersView from './screen-time-tiers-view'

export default async function ScreenTimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile || profile.role === 'child') redirect('/today')

  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', profile.family_id)
    .eq('active', true)
    .order('created_at')

  const { data: tiers } = await supabase
    .from('screen_time_reward_tiers')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('child_id')
    .order('min_points')

  return (
    <ScreenTimeTiersView
      children={children || []}
      initialTiers={tiers || []}
    />
  )
}
