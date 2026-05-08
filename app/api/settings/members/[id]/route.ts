import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAuthAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!callerProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (callerProfile.role !== 'family_admin') return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })

  const admin = createAuthAdminClient()
  const { data: target } = await admin
    .from('profiles')
    .select('auth_user_id, family_id')
    .eq('id', id)
    .single()

  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (target.family_id !== callerProfile.family_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (target.auth_user_id === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  const { error: deleteProfileError } = await admin
    .from('profiles')
    .delete()
    .eq('id', id)

  if (deleteProfileError) return NextResponse.json({ error: deleteProfileError.message }, { status: 500 })

  await admin.auth.admin.deleteUser(target.auth_user_id)

  return NextResponse.json({ ok: true })
}
