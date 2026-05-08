export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, child:children(*)')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/setup')

  const { data: children_data } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', profile.family_id)
    .eq('active', true)
    .order('name')

  return (
    <AppShell profile={profile} children={children_data || []} reactChildren={children} />
  )
}
