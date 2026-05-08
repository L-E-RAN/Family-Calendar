import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createAuthAdminClient } from '@/lib/supabase/admin'

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

  const adminSupabase = await createAdminClient()
  const { data: profiles } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('family_id', profile.family_id)
    .order('created_at')

  const members = (profiles ?? []).map(p => ({
    ...p,
    is_self: p.auth_user_id === user.id,
  }))

  return NextResponse.json({ members })
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

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (profile.role !== 'family_admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const body = await request.json()
  const { password, display_name, role } = body

  if (!password || !display_name || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!['parent', 'child'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Generate opaque internal email — users never see or use it
  const internalEmail = `member-${crypto.randomUUID()}@family.local`

  const authAdmin = createAuthAdminClient()
  const { data: newUser, error: authError } = await authAdmin.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message || 'Failed to create auth user' }, { status: 500 })
  }

  const adminSupabase = await createAdminClient()
  const { data: newProfile, error: profileError } = await adminSupabase
    .from('profiles')
    .insert({
      auth_user_id: newUser.user.id,
      family_id: profile.family_id,
      display_name: display_name.trim(),
      role,
    })
    .select()
    .single()

  if (profileError) {
    await authAdmin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ member: { ...newProfile, is_self: false } }, { status: 201 })
}
