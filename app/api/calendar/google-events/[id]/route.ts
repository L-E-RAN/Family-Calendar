import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAccessToken, updateEvent, deleteEvent } from '@/lib/google/calendar'

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

  const { data: item } = await supabase
    .from('calendar_items')
    .select('id, external_id, source_calendar_id, source_integration_id, is_editable')
    .eq('id', id)
    .eq('family_id', profile.family_id)
    .single()

  if (!item) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  if (!item.is_editable || !item.external_id) {
    return NextResponse.json({ error: 'האירוע אינו ניתן לעריכה' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()
  const { data: integration } = await adminSupabase
    .from('integrations')
    .select('encrypted_secret_ref')
    .eq('id', item.source_integration_id)
    .single()

  const { data: calendar } = await adminSupabase
    .from('external_calendars')
    .select('provider_calendar_id')
    .eq('id', item.source_calendar_id)
    .single()

  if (!integration?.encrypted_secret_ref || !calendar) {
    return NextResponse.json({ error: 'חיבור Google לא תקין' }, { status: 400 })
  }

  const body = await request.json()
  try {
    const accessToken = await getAccessToken(integration.encrypted_secret_ref)
    const updated = await updateEvent({
      accessToken,
      calendarId: calendar.provider_calendar_id,
      eventId: item.external_id,
      ...body,
    })

    const { data: updatedItem } = await adminSupabase
      .from('calendar_items')
      .update({
        title: updated.summary || body.title,
        description: updated.description || body.description,
        location: updated.location || body.location,
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        updated_by_profile_id: profile.id,
        source_updated_at: updated.updated ? new Date(updated.updated).toISOString() : null,
        raw: updated as unknown as Record<string, unknown>,
      })
      .eq('id', id)
      .select()
      .single()

    return NextResponse.json({ item: updatedItem })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'שגיאה בעדכון'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
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

  const { data: item } = await supabase
    .from('calendar_items')
    .select('id, external_id, source_calendar_id, source_integration_id, is_editable')
    .eq('id', id)
    .eq('family_id', profile.family_id)
    .single()

  if (!item) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  if (!item.is_editable || !item.external_id) {
    return NextResponse.json({ error: 'האירוע אינו ניתן למחיקה' }, { status: 400 })
  }

  const adminSupabase = await createAdminClient()
  const { data: integration } = await adminSupabase
    .from('integrations')
    .select('encrypted_secret_ref')
    .eq('id', item.source_integration_id)
    .single()

  const { data: calendar } = await adminSupabase
    .from('external_calendars')
    .select('provider_calendar_id')
    .eq('id', item.source_calendar_id)
    .single()

  if (!integration?.encrypted_secret_ref || !calendar) {
    return NextResponse.json({ error: 'חיבור Google לא תקין' }, { status: 400 })
  }

  try {
    const accessToken = await getAccessToken(integration.encrypted_secret_ref)
    await deleteEvent({
      accessToken,
      calendarId: calendar.provider_calendar_id,
      eventId: item.external_id,
    })

    await adminSupabase
      .from('calendar_items')
      .update({ status: 'cancelled', updated_by_profile_id: profile.id })
      .eq('id', id)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'שגיאה במחיקה'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
