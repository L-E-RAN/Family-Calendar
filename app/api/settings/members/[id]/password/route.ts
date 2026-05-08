import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createAuthAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id, family_id, role, auth_user_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!callerProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const adminSupabase = await createAdminClient()
  const { data: target } = await adminSupabase
    .from('profiles')
    .select('auth_user_id, family_id')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (target.family_id !== callerProfile.family_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isSelf = target.auth_user_id === user.id
  const isAdmin = callerProfile.role === 'family_admin'

  // Admin can change anyone's password. Non-admin can only change own.
  if (!isAdmin && !isSelf) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { password } = await request.json()
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'סיסמה חייבת להיות לפחות 6 תווים' }, { status: 400 })
  }

  const authAdmin = createAuthAdminClient()
  const { error } = await authAdmin.auth.admin.updateUserById(target.auth_user_id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
