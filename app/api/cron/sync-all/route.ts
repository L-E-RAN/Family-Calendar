import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAccessToken, fetchCalendarEvents, mapGoogleEventToItem, listCalendars } from '@/lib/google/calendar'
import { mapHomeworkToItem, mapLessonToItem, mapExamToItem, mapParentApprovalToItem } from '@/lib/mashov/mapper'
import { RealMashovAdapter } from '@/lib/mashov/real-adapter'
import { decryptToken } from '@/lib/google/calendar'
import { subMonths, addMonths, format } from 'date-fns'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminSupabase = await createAdminClient()
  const results: Record<string, unknown> = {}

  // ── Google Calendar sync ──────────────────────────────────────────
  const { data: googleIntegrations } = await adminSupabase
    .from('integrations')
    .select('id, family_id, encrypted_secret_ref')
    .eq('provider', 'google_calendar')
    .eq('status', 'connected')
    .not('encrypted_secret_ref', 'is', null)

  const now = new Date()
  const from = subMonths(now, 1)
  const to = addMonths(now, 12)
  let googleSynced = 0
  const googleErrors: string[] = []

  for (const integration of googleIntegrations ?? []) {
    try {
      let { data: calendars } = await adminSupabase
        .from('external_calendars')
        .select('id, provider_calendar_id, name, writable')
        .eq('integration_id', integration.id)
        .eq('selected', true)

      if (!calendars?.length) {
        const accessToken = await getAccessToken(integration.encrypted_secret_ref!)
        const items = await listCalendars(accessToken)
        const familyCal = items.find(c => c.summary === 'משפחת אשואל')
        const primaryCal = items.find(c => c.primary === true)
        const selectedId = familyCal?.id || primaryCal?.id
        for (const item of items) {
          if (!item.id || !item.summary) continue
          await adminSupabase.from('external_calendars').upsert({
            family_id: integration.family_id,
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
      }

      for (const cal of calendars ?? []) {
        const accessToken = await getAccessToken(integration.encrypted_secret_ref!)
        const events = await fetchCalendarEvents({ accessToken, calendarId: cal.provider_calendar_id, from, to })
        for (const event of events) {
          if (!event.id) continue
          const itemData = mapGoogleEventToItem(event, integration.family_id, integration.id, cal.id, cal.provider_calendar_id)
          await adminSupabase.from('calendar_items').upsert(itemData, { onConflict: 'dedupe_key' })
          googleSynced++
        }
      }

      await adminSupabase.from('integrations')
        .update({ last_sync_at: new Date().toISOString(), last_error: null })
        .eq('id', integration.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      googleErrors.push(`family ${integration.family_id}: ${msg}`)
      await adminSupabase.from('integrations').update({ last_error: msg, status: 'error' }).eq('id', integration.id)
    }
  }

  results.google = { synced: googleSynced, errors: googleErrors }

  // ── Mashov sync ──────────────────────────────────────────────────
  const { data: mashovIntegrations } = await adminSupabase
    .from('integrations')
    .select('id, family_id, encrypted_secret_ref')
    .eq('provider', 'mashov')
    .eq('status', 'connected')
    .not('encrypted_secret_ref', 'is', null)

  const mashovFrom = format(subMonths(now, 1), 'yyyy-MM-dd')
  const mashovTo = format(addMonths(now, 12), 'yyyy-MM-dd')
  const mashovResults: Record<string, number> = {}
  const mashovErrors: string[] = []

  for (const integration of mashovIntegrations ?? []) {
    const { data: children } = await adminSupabase
      .from('children')
      .select('id, mashov_student_id, name')
      .eq('family_id', integration.family_id)
      .eq('active', true)
      .not('mashov_student_id', 'is', null)

    if (!children?.length) continue

    try {
      const credentials = JSON.parse(decryptToken(integration.encrypted_secret_ref!))
      const adapter = new RealMashovAdapter()
      const connectResult = await adapter.connect(credentials)
      if (!connectResult.success) throw new Error(connectResult.error)

      for (const child of children) {
        if (!child.mashov_student_id) continue
        const studentId = child.mashov_student_id
        try {
          const [homework, timetable, exams, approvals] = await Promise.all([
            adapter.fetchHomework({ studentId, from: mashovFrom, to: mashovTo }),
            adapter.fetchTimetable({ studentId, from: mashovFrom, to: mashovTo }),
            adapter.fetchExams({ studentId, from: mashovFrom, to: mashovTo }),
            adapter.fetchParentApprovals({ studentId, from: mashovFrom, to: mashovTo }),
          ])
          const items = [
            ...homework.map(hw => mapHomeworkToItem(hw, integration.family_id, child.id, integration.id)),
            ...timetable.map(l => mapLessonToItem(l, integration.family_id, child.id, integration.id)),
            ...exams.map(e => mapExamToItem(e, integration.family_id, child.id, integration.id)),
            ...approvals.map(a => mapParentApprovalToItem(a, integration.family_id, child.id, integration.id)),
          ]
          for (const item of items) {
            await adminSupabase.from('calendar_items').upsert(item, { onConflict: 'dedupe_key' })
          }
          mashovResults[child.name] = (mashovResults[child.name] || 0) + items.length
        } catch (err) {
          mashovErrors.push(`${child.name}: ${err instanceof Error ? err.message : String(err)}`)
        }
      }

      await adminSupabase.from('integrations')
        .update({ last_sync_at: new Date().toISOString(), last_error: mashovErrors.join('; ') || null, status: 'connected' })
        .eq('id', integration.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      mashovErrors.push(`family ${integration.family_id}: ${msg}`)
      await adminSupabase.from('integrations').update({ last_error: msg, status: 'error' }).eq('id', integration.id)
    }
  }

  results.mashov = { results: mashovResults, errors: mashovErrors }

  return NextResponse.json({ ok: true, ...results })
}
