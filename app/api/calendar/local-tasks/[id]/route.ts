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
  const allowedFields = ['title', 'description', 'due_at', 'starts_at', 'ends_at', 'priority', 'visibility', 'child_id', 'status']
  const update: Record<string, unknown> = { updated_by_profile_id: profile.id }
  for (const field of allowedFields) {
    if (field in body) update[field] = body[field]
  }

  const { data, error } = await supabase
    .from('calendar_items')
    .update(update)
    .eq('id', id)
    .eq('family_id', profile.family_id)
    .eq('source_provider', 'local')
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  return NextResponse.json({ item: data })
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

  if (!profile || !['family_admin', 'parent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('calendar_items')
    .delete()
    .eq('id', id)
    .eq('family_id', profile.family_id)
    .eq('source_provider', 'local')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
