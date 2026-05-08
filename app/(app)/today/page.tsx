import { createClient } from '@/lib/supabase/server'
import TodayView from '@/components/today-view'
import { startOfDay, endOfDay, format } from 'date-fns'

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user!.id)
    .single()

  const now = new Date()
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()

  let query = supabase
    .from('calendar_items')
    .select('*, child:children(id, name, color), overlay:calendar_item_overlays(*)')
    .neq('status', 'hidden')
    .neq('status', 'cancelled')

  // For children, only show their items + family items
  if (profile?.role === 'child' && profile.child_id) {
    query = query.or(`child_id.eq.${profile.child_id},child_id.is.null`)
  }

  // Today's lessons
  const { data: lessons } = await supabase
    .from('calendar_items')
    .select('*, child:children(id, name, color)')
    .eq('source_type', 'lesson')
    .gte('starts_at', todayStart)
    .lte('starts_at', todayEnd)
    .neq('status', 'hidden')
    .order('starts_at')

  // Due today + open homework
  const { data: homework } = await supabase
    .from('calendar_items')
    .select('*, child:children(id, name, color), overlay:calendar_item_overlays(*)')
    .eq('source_type', 'homework')
    .or(`due_at.gte.${todayStart},due_at.is.null`)
    .neq('status', 'hidden')
    .order('due_at', { nullsFirst: false })

  // Upcoming exams (next 14 days)
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: exams } = await supabase
    .from('calendar_items')
    .select('*, child:children(id, name, color)')
    .eq('source_type', 'exam')
    .gte('starts_at', todayStart)
    .lte('starts_at', twoWeeks)
    .neq('status', 'hidden')
    .order('starts_at')

  // Parent approvals needing action
  const { data: approvals } = await supabase
    .from('calendar_items')
    .select('*, child:children(id, name, color)')
    .eq('source_type', 'parent_approval')
    .eq('status', 'needs_action')
    .order('starts_at')

  // Today's family tasks
  const { data: tasks } = await supabase
    .from('calendar_items')
    .select('*, child:children(id, name, color), overlay:calendar_item_overlays(*)')
    .eq('source_type', 'task')
    .eq('status', 'active')
    .or(`due_at.gte.${todayStart},due_at.is.null`)
    .order('due_at', { nullsFirst: false })

  return (
    <TodayView
      profile={profile!}
      lessons={lessons || []}
      homework={homework || []}
      exams={exams || []}
      approvals={approvals || []}
      tasks={tasks || []}
    />
  )
}
