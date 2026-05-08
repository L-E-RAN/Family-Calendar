export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TabletProvider from '@/components/tablet/tablet-context'

export default async function TabletLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) redirect('/setup')

  // Tablet mode: full-screen, no sidebar, no bottom nav
  return (
    <TabletProvider profile={profile}>
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {children}
      </div>
    </TabletProvider>
  )
}
