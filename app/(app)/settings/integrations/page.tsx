import { createClient } from '@/lib/supabase/server'
import IntegrationsView from '@/components/integrations/integrations-view'
import { redirect } from 'next/navigation'

export default async function IntegrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single()

  if (profile?.role === 'child') redirect('/today')

  const { data: integrations } = await supabase
    .from('integrations')
    .select('*')
    .eq('family_id', profile!.family_id)

  const { data: calendars } = await supabase
    .from('external_calendars')
    .select('*')
    .eq('family_id', profile!.family_id)

  const { data: recentLogs } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('family_id', profile!.family_id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <IntegrationsView
        profile={profile!}
        integrations={integrations || []}
        calendars={calendars || []}
        recentLogs={recentLogs || []}
      />
    </div>
  )
}
