import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}))
  const deleteItems = body.deleteItems === true

  const adminSupabase = await createAdminClient()

  const { data: integration } = await adminSupabase
    .from('integrations')
    .select('id')
    .eq('family_id', profile.family_id)
    .eq('provider', 'google_calendar')
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'לא נמצא חיבור Google' }, { status: 404 })
  }

  if (deleteItems) {
    await adminSupabase
      .from('calendar_items')
      .delete()
      .eq('family_id', profile.family_id)
      .eq('source_provider', 'google_calendar')
  }

  await adminSupabase
    .from('external_calendars')
    .delete()
    .eq('integration_id', integration.id)

  await adminSupabase
    .from('integrations')
    .update({
      status: 'disabled',
      encrypted_secret_ref: null,
      last_error: null,
    })
    .eq('id', integration.id)

  await adminSupabase.from('sync_logs').insert({
    family_id: profile.family_id,
    integration_id: integration.id,
    level: 'info',
    message: 'Google Calendar disconnected',
    metadata: { deleteItems },
  })

  return NextResponse.json({ success: true })
}
