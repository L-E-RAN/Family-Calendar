import { createClient } from '@/lib/supabase/server'
import { createAuthAdminClient } from '@/lib/supabase/admin'
import MembersManager from '@/components/settings/members-manager'

export default async function MembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('auth_user_id', user!.id)
    .single()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('family_id', profile!.family_id)
    .order('created_at')

  const authAdmin = createAuthAdminClient()
  const { data: { users } } = await authAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emailByAuthId = Object.fromEntries(users.map(u => [u.id, u.email ?? '']))

  const members = (profiles ?? []).map(p => ({
    ...p,
    email: emailByAuthId[p.auth_user_id] ?? '',
    is_self: p.auth_user_id === user!.id,
  }))

  return (
    <MembersManager
      initialMembers={members}
      isAdmin={profile!.role === 'family_admin'}
    />
  )
}
