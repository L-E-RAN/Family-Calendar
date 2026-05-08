// Supabase Edge Function — sync Google Calendar "משפחת אשואל"
// Triggered by Supabase Cron every 15 minutes or by webhook trigger
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    // Get all Google Calendar integrations that are connected or dirty
    const { data: integrations } = await supabase
      .from('integrations')
      .select('id, family_id, encrypted_secret_ref, status, metadata')
      .eq('provider', 'google_calendar')
      .in('status', ['connected', 'error'])

    if (!integrations?.length) {
      return new Response(JSON.stringify({ message: 'No active Google integrations' }), { status: 200 })
    }

    const results = []

    for (const integration of integrations) {
      try {
        if (!integration.encrypted_secret_ref) continue

        const refreshToken = decrypt(integration.encrypted_secret_ref)
        const accessToken = await getAccessToken(refreshToken)

        const { data: calendars } = await supabase
          .from('external_calendars')
          .select('id, provider_calendar_id, name')
          .eq('integration_id', integration.id)
          .eq('selected', true)

        if (!calendars?.length) continue

        const now = new Date()
        const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const to = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

        for (const cal of calendars) {
          const events = await fetchEvents(accessToken, cal.provider_calendar_id, from, to)
          let synced = 0

          for (const event of events) {
            if (!event.id) continue
            const item = mapEvent(event, integration.family_id, integration.id, cal.id, cal.provider_calendar_id)
            await supabase.from('calendar_items').upsert(item, { onConflict: 'dedupe_key' })
            synced++
          }

          results.push({ calendar: cal.name, synced })
        }

        await supabase
          .from('integrations')
          .update({ last_sync_at: now.toISOString(), status: 'connected', last_error: null })
          .eq('id', integration.id)

        await supabase.from('sync_logs').insert({
          family_id: integration.family_id,
          integration_id: integration.id,
          level: 'info',
          message: `Google Calendar sync complete`,
          metadata: { results },
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown'
        await supabase
          .from('integrations')
          .update({ last_error: msg, status: msg.includes('401') || msg.includes('invalid') ? 'needs_reauth' : 'error' })
          .eq('id', integration.id)

        await supabase.from('sync_logs').insert({
          family_id: integration.family_id,
          integration_id: integration.id,
          level: 'error',
          message: `Sync error: ${msg}`,
          metadata: {},
        })
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), { status: 200 })
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

async function fetchEvents(accessToken: string, calendarId: string, from: Date, to: Date) {
  const params = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: 'true',
    maxResults: '2500',
  })
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Calendar API error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.items || []
}

function mapEvent(event: Record<string, unknown>, familyId: string, integrationId: string, calDbId: string, calId: string) {
  const start = event.start as Record<string, string>
  const end = event.end as Record<string, string>
  const allDay = !start?.dateTime && Boolean(start?.date)
  const startsAt = allDay
    ? new Date(start.date + 'T00:00:00+02:00').toISOString()
    : start?.dateTime ? new Date(start.dateTime).toISOString() : null
  const endsAt = allDay
    ? new Date((end?.date || start.date) + 'T23:59:00+02:00').toISOString()
    : end?.dateTime ? new Date(end.dateTime).toISOString() : null

  return {
    family_id: familyId,
    child_id: null,
    source_provider: 'google_calendar',
    source_type: 'event',
    source_integration_id: integrationId,
    source_calendar_id: calDbId,
    external_id: event.id as string,
    dedupe_key: `google_calendar:${integrationId}:${calId}:${event.id}`,
    title: (event.summary as string) || '(ללא כותרת)',
    description: (event.description as string) || null,
    location: (event.location as string) || null,
    subject: null,
    teacher: null,
    starts_at: startsAt,
    ends_at: endsAt,
    due_at: null,
    all_day: allDay,
    status: event.status === 'cancelled' ? 'cancelled' : 'active',
    priority: null,
    color: (event.colorId as string) || null,
    visibility: 'family',
    is_editable: true,
    source_updated_at: event.updated ? new Date(event.updated as string).toISOString() : null,
    raw: event,
  }
}

function decrypt(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(':')
  // Deno-compatible AES-CBC decryption
  const key = hexToBytes(ENCRYPTION_KEY)
  const iv = hexToBytes(ivHex)
  const enc = hexToBytes(encHex)

  // Use Web Crypto API
  return decryptAES(key, iv, enc)
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return arr
}

async function decryptAES(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, data)
  return new TextDecoder().decode(decrypted)
}
