import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLogicalDateString } from '@/lib/today/logical-date'
import { broadcastCompletionChange } from '@/lib/realtime/broadcast'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || !['family_admin', 'parent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { child_id, task_name, points } = body

  if (!child_id || !task_name?.trim() || !points || points <= 0) {
    return NextResponse.json({ error: 'נתונים חסרים או לא תקינים' }, { status: 400 })
  }

  const completionDate = getLogicalDateString()
  const dedupeKey = `local:penalty:${profile.family_id}:${Date.now()}:${Math.random().toString(36).slice(2)}`

  // Use today's date bounds so the task appears on the board today only
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const { data: item, error: itemError } = await supabase
    .from('calendar_items')
    .insert({
      family_id: profile.family_id,
      child_id,
      source_provider: 'local',
      source_type: 'task',
      dedupe_key: dedupeKey,
      title: task_name.trim(),
      all_day: false,
      due_at: todayEnd.toISOString(),
      status: 'active',
      priority: 'normal',
      visibility: 'family',
      is_editable: false,
      created_by_profile_id: profile.id,
      updated_by_profile_id: profile.id,
      reward_enabled: true,
      points_value: 0,
      penalty_points: points,
      requires_parent_approval: false,
      is_recurring: false,
    })
    .select('id')
    .single()

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 })

  // Find child's profile_id (may not exist for tablet-only children)
  const { data: childProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('family_id', profile.family_id)
    .eq('child_id', child_id)
    .maybeSingle()

  const completionProfileId = childProfile?.id ?? profile.id

  const { error: completionError } = await supabase
    .from('daily_item_completions')
    .insert({
      family_id: profile.family_id,
      item_id: item.id,
      profile_id: completionProfileId,
      child_id,
      completion_date: completionDate,
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by_profile_id: profile.id,
      points_awarded: 0,
      penalty_applied: points,
    })

  if (completionError) return NextResponse.json({ error: completionError.message }, { status: 500 })

  broadcastCompletionChange(profile.family_id)

  return NextResponse.json({ ok: true })
}
