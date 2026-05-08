import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { broadcastCompletionChange } from '@/lib/realtime/broadcast'

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
  if (profile.role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const completionId: string | undefined = body.completion_id

  let query = supabase
    .from('daily_item_completions')
    .select('*')
    .eq('item_id', id)
    .eq('family_id', profile.family_id)
    .eq('status', 'completed_pending_approval')

  if (completionId) query = query.eq('id', completionId)

  const { data: completion, error: fetchErr } = await query.single()
  if (fetchErr || !completion) {
    return NextResponse.json({ error: 'Completion not found or already processed' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('daily_item_completions')
    .update({
      status: 'rejected',
      points_awarded: 0,
      parent_approved_at: new Date().toISOString(),
      parent_approved_by_profile_id: profile.id,
    })
    .eq('id', completion.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  broadcastCompletionChange(profile.family_id)
  return NextResponse.json({ completion: data })
}
