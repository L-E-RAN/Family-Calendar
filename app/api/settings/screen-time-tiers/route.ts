import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('screen_time_reward_tiers')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('child_id')
    .order('min_points')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tiers: data })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile || !['family_admin', 'parent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { child_id, min_points, screen_time_minutes, label } = body

  if (!child_id || min_points == null || screen_time_minutes == null) {
    return NextResponse.json({ error: 'child_id, min_points, screen_time_minutes נדרשים' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('screen_time_reward_tiers')
    .insert({
      family_id: profile.family_id,
      child_id,
      min_points: Number(min_points),
      screen_time_minutes: Number(screen_time_minutes),
      label: label || null,
      active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tier: data }, { status: 201 })
}
