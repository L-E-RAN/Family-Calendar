import { createClient } from '@/lib/supabase/server'
import ChildrenManager from '@/components/children/children-manager'

export default async function ChildrenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, role')
    .eq('auth_user_id', user!.id)
    .single()

  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', profile!.family_id)
    .order('name')

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <ChildrenManager initialChildren={children || []} canEdit={profile!.role !== 'child'} />
    </div>
  )
}
