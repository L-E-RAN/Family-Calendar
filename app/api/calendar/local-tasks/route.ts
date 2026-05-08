import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CreateLocalTaskInput } from '@/types'

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

  const body: CreateLocalTaskInput = await request.json()
  if (!body.title?.trim()) {
    return NextResponse.json({ error: 'כותרת נדרשת' }, { status: 400 })
  }

  const dedupeKey = `local:task:${profile.family_id}:${Date.now()}:${Math.random().toString(36).slice(2)}`

  const { data, error } = await supabase
    .from('calendar_items')
    .insert({
      family_id: profile.family_id,
      child_id: body.child_id || null,
      source_provider: 'local',
      source_type: 'task',
      dedupe_key: dedupeKey,
      title: body.title.trim(),
      description: body.description || null,
      due_at: body.due_at || null,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      all_day: !body.starts_at,
      status: 'active',
      priority: body.priority || 'normal',
      visibility: body.visibility || 'family',
      is_editable: true,
      created_by_profile_id: profile.id,
      updated_by_profile_id: profile.id,
      reward_enabled: body.reward_enabled ?? false,
      points_value: body.points_value ?? 0,
      penalty_points: body.penalty_points ?? 0,
      deadline_time: body.deadline_time ?? null,
      requires_parent_approval: body.requires_parent_approval ?? false,
      is_recurring: body.is_recurring ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
