import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TabletSettingsView from '@/components/settings/tablet-settings-view'

export default async function TabletSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single()

  if (profile?.role === 'child') redirect('/today')

  const { data: family } = await supabase
    .from('families')
    .select('tablet_pin_hash')
    .eq('id', profile!.family_id)
    .single()

  return (
    <TabletSettingsView
      hasPinSet={!!family?.tablet_pin_hash}
    />
  )
}
