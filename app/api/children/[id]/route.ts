import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  const allowed = ['name', 'color', 'mashov_student_id', 'active', 'school_name', 'school_code']
  const update: Record<string, unknown> = {}
  for (const k of allowed) {
    if (k in body) update[k] = body[k]
  }

  const { data, error } = await supabase
    .from('children')
    .update(update)
    .eq('id', id)
    .eq('family_id', profile.family_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  return NextResponse.json({ child: data })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'family_admin') {
    return NextResponse.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 })
  }

  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id)
    .eq('family_id', profile.family_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
