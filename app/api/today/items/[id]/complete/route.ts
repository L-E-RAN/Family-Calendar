import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { evaluateDeadline } from '@/lib/rewards/evaluate-deadline'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: item } = await supabase
    .from('calendar_items')
    .select('*')
    .eq('id', id)
    .eq('family_id', profile.family_id)
    .single()
  if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

  // Mashov items are read-only from source
  if (item.source_provider === 'mashov') {
    return NextResponse.json({ error: 'Mashov items cannot be completed via this endpoint' }, { status: 400 })
  }

  // Children can only complete items assigned to them
  if (profile.role === 'child' && item.child_id && item.child_id !== profile.child_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proxy completion: parent/admin can mark a task on behalf of a child.
  // Points go to the child; completed_by_profile_id records the actual actor.
  const body = await request.json().catch(() => ({}))
  const targetChildId: string | null = body.target_child_id ?? null

  let completionProfileId = profile.id
  let completionChildId = item.child_id ?? profile.child_id ?? null

  if (targetChildId && profile.role !== 'child') {
    completionChildId = targetChildId
    // Use child's own profile_id so score shows in their column
    const { data: childProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('family_id', profile.family_id)
      .eq('child_id', targetChildId)
      .maybeSingle()
    if (childProfile) completionProfileId = childProfile.id
  }

  const now = new Date()
  const completionDate = format(now, 'yyyy-MM-dd')
  const eval_ = evaluateDeadline(item, now, completionDate)

  let status: string
  let pointsAwarded: number

  if (item.requires_parent_approval) {
    status = 'completed_pending_approval'
    pointsAwarded = 0
  } else if (!item.reward_enabled) {
    status = 'completed'
    pointsAwarded = 0
  } else {
    status = eval_.suggestedStatus
    pointsAwarded = eval_.pointsToAward
  }

  const { data, error } = await supabase
    .from('daily_item_completions')
    .upsert({
      family_id: profile.family_id,
      item_id: id,
      profile_id: completionProfileId,
      child_id: completionChildId,
      completion_date: completionDate,
      status,
      completed_at: now.toISOString(),
      completed_by_profile_id: profile.id,
      points_awarded: pointsAwarded,
      penalty_applied: 0,
    }, { onConflict: 'item_id,profile_id,completion_date' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Non-recurring tasks are marked done on the item itself so they don't reappear tomorrow
  if (!item.is_recurring && item.source_provider === 'local') {
    await supabase
      .from('calendar_items')
      .update({ status: 'completed', updated_by_profile_id: profile.id })
      .eq('id', id)
      .eq('family_id', profile.family_id)
  }

  return NextResponse.json({ completion: data })
}
