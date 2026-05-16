import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAccessToken, fetchCalendarEvents, mapGoogleEventToItem, listCalendars } from '@/lib/google/calendar'
import { subMonths, addMonths } from 'date-fns'

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

  const adminSupabase = await createAdminClient()
  const { data: integration } = await adminSupabase
    .from('integrations')
    .select('id, encrypted_secret_ref, status')
    .eq('family_id', profile.family_id)
    .eq('provider', 'google_calendar')
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'Google Calendar לא מוגדר' }, { status: 400 })
  }

  if (!integration.encrypted_secret_ref) {
    return NextResponse.json({ error: 'אין פרטי חיבור' }, { status: 400 })
  }

  let { data: calendars } = await adminSupabase
    .from('external_calendars')
    .select('id, provider_calendar_id, name, writable')
    .eq('integration_id', integration.id)
    .eq('selected', true)

  // Auto-populate external_calendars if empty (callback may have failed to save them)
  if (!calendars?.length) {
    try {
      const accessToken = await getAccessToken(integration.encrypted_secret_ref)
      const items = await listCalendars(accessToken)
      const familyCal = items.find(c => c.summary === 'משפחת אשואל')
      const primaryCal = items.find(c => c.primary === true)
      const selectedId = familyCal?.id || primaryCal?.id

      for (const item of items) {
        if (!item.id || !item.summary) continue
        await adminSupabase
          .from('external_calendars')
          .upsert({
            family_id: profile.family_id,
            integration_id: integration.id,
            provider_calendar_id: item.id,
            name: item.summary,
            color: item.backgroundColor || '#4285f4',
            selected: item.id === selectedId,
            writable: item.accessRole === 'owner' || item.accessRole === 'writer',
            default_for_new_events: item.id === selectedId,
          }, { onConflict: 'integration_id,provider_calendar_id' })
      }

      const { data: refetched } = await adminSupabase
        .from('external_calendars')
        .select('id, provider_calendar_id, name, writable')
        .eq('integration_id', integration.id)
        .eq('selected', true)

      calendars = refetched
    } catch {
      // fall through to error below
    }
  }

  if (!calendars?.length) {
    return NextResponse.json({ error: 'לא נמצאו לוחות שנה מחוברים' }, { status: 400 })
  }

  const now = new Date()
  const from = subMonths(now, 1)
  const to = addMonths(now, 12)

  let synced = 0
  const errors: string[] = []

  for (const cal of calendars) {
    try {
      const accessToken = await getAccessToken(integration.encrypted_secret_ref)
      const events = await fetchCalendarEvents({
        accessToken,
        calendarId: cal.provider_calendar_id,
        from,
        to,
      })

      for (const event of events) {
        if (!event.id) continue
        const itemData = mapGoogleEventToItem(
          event,
          profile.family_id,
          integration.id,
          cal.id,
          cal.provider_calendar_id
        )

        await adminSupabase
          .from('calendar_items')
          .upsert(itemData, { onConflict: 'dedupe_key' })

        synced++
      }

      await adminSupabase
        .from('integrations')
        .update({ last_sync_at: new Date().toISOString(), last_error: null, status: 'connected' })
        .eq('id', integration.id)

      await adminSupabase.from('sync_logs').insert({
        family_id: profile.family_id,
        integration_id: integration.id,
        level: 'info',
        message: `סנכרן ${events.length} אירועים מ-${cal.name}`,
        metadata: { calendarId: cal.id, count: events.length },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown'
      errors.push(msg)
      await adminSupabase
        .from('integrations')
        .update({ last_error: msg, status: 'error' })
        .eq('id', integration.id)

      await adminSupabase.from('sync_logs').insert({
        family_id: profile.family_id,
        integration_id: integration.id,
        level: 'error',
        message: `שגיאת סנכרון: ${msg}`,
        metadata: { calendarId: cal.id },
      })
    }
  }

  return NextResponse.json({ synced, errors })
}
