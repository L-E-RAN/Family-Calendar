import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAccessToken, createEvent, mapGoogleEventToItem, decryptToken } from '@/lib/google/calendar'
import type { CreateGoogleEventInput } from '@/types'

export async function POST(request: NextRequest) {
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

  // Get Google integration
  const adminSupabase = await createAdminClient()
  const { data: integration } = await adminSupabase
    .from('integrations')
    .select('id, encrypted_secret_ref, status')
    .eq('family_id', profile.family_id)
    .eq('provider', 'google_calendar')
    .eq('status', 'connected')
    .single()

  if (!integration?.encrypted_secret_ref) {
    return NextResponse.json({ error: 'Google Calendar לא מחובר' }, { status: 400 })
  }

  const { data: calendar } = await adminSupabase
    .from('external_calendars')
    .select('id, provider_calendar_id')
    .eq('integration_id', integration.id)
    .eq('default_for_new_events', true)
    .single()

  if (!calendar) {
    return NextResponse.json({ error: 'לא נמצא לוח שנה ברירת מחדל' }, { status: 400 })
  }

  const body: CreateGoogleEventInput = await request.json()
  if (!body.title?.trim() || !body.starts_at || !body.ends_at) {
    return NextResponse.json({ error: 'שדות חסרים' }, { status: 400 })
  }

  try {
    const accessToken = await getAccessToken(integration.encrypted_secret_ref)
    const googleEvent = await createEvent({
      accessToken,
      calendarId: calendar.provider_calendar_id,
      title: body.title.trim(),
      description: body.description,
      location: body.location,
      startsAt: body.starts_at,
      endsAt: body.ends_at,
      allDay: body.all_day,
    })

    const itemData = mapGoogleEventToItem(
      googleEvent,
      profile.family_id,
      integration.id,
      calendar.id,
      calendar.provider_calendar_id
    )

    const { data: item, error: itemError } = await adminSupabase
      .from('calendar_items')
      .insert({ ...itemData, created_by_profile_id: profile.id, updated_by_profile_id: profile.id })
      .select()
      .single()

    if (itemError) throw new Error(itemError.message)
    return NextResponse.json({ item }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'שגיאה ביצירת אירוע'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
