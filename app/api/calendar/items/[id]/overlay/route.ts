import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, child_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { local_status, notes, local_color, reminder_at } = body

  const { data, error } = await supabase
    .from('calendar_item_overlays')
    .upsert({
      family_id: profile.family_id,
      item_id: id,
      profile_id: profile.id,
      child_id: profile.child_id || null,
      local_status: local_status ?? null,
      notes: notes ?? null,
      local_color: local_color ?? null,
      reminder_at: reminder_at ?? null,
    }, { onConflict: 'item_id,profile_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ overlay: data })
}
