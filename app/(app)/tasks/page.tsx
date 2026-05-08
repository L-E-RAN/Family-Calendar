import { createClient } from '@/lib/supabase/server'
import TasksView from '@/components/tasks/tasks-view'
import { startOfDay, endOfDay } from 'date-fns'

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single()

  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd = endOfDay(new Date()).toISOString()

  // Tasks: no date filter. Homework: only due today.
  let query = supabase
    .from('calendar_items')
    .select('*, child:children(id, name, color), overlay:calendar_item_overlays(*)')
    .or(`source_type.eq.task,and(source_type.eq.homework,due_at.gte.${todayStart},due_at.lte.${todayEnd})`)
    .neq('status', 'hidden')
    .neq('status', 'cancelled')
    .order('due_at', { nullsFirst: false })

  if (profile?.role === 'child' && profile.child_id) {
    query = query.or(`child_id.eq.${profile.child_id},child_id.is.null`)
  }

  const { data: tasks } = await query
  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('family_id', profile!.family_id)
    .eq('active', true)

  return (
    <TasksView
      tasks={tasks || []}
      children={children || []}
      profile={profile!}
    />
  )
}
