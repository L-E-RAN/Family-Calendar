import { google } from 'googleapis'
import { createHash } from 'crypto'
import type { CalendarItem } from '@/types'

const FAMILY_CALENDAR_NAME = 'משפחת אשואל'

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  )
}

export function getAuthUrl(state: string): string {
  const client = createOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    login_hint: process.env.GOOGLE_CALENDAR_ACCOUNT ?? 'ashwalgmail@gmail.com',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
    ],
    state,
  })
}

export async function exchangeCode(code: string) {
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)
  return tokens
}

export async function getAccessToken(encryptedRefreshToken: string): Promise<string> {
  const refreshToken = decryptToken(encryptedRefreshToken)
  const client = createOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Failed to get access token')
  return token
}

export async function listCalendars(accessToken: string) {
  const client = createOAuthClient()
  client.setCredentials({ access_token: accessToken })
  const cal = google.calendar({ version: 'v3', auth: client })
  const res = await cal.calendarList.list()
  return res.data.items || []
}

export async function findFamilyCalendar(accessToken: string) {
  const calendars = await listCalendars(accessToken)
  return calendars.find(c => c.summary === FAMILY_CALENDAR_NAME) || null
}

export async function fetchCalendarEvents(params: {
  accessToken: string
  calendarId: string
  from: Date
  to: Date
}) {
  const client = createOAuthClient()
  client.setCredentials({ access_token: params.accessToken })
  const cal = google.calendar({ version: 'v3', auth: client })

  const res = await cal.events.list({
    calendarId: params.calendarId,
    timeMin: params.from.toISOString(),
    timeMax: params.to.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500,
  })

  return res.data.items || []
}

export async function createEvent(params: {
  accessToken: string
  calendarId: string
  title: string
  description?: string
  location?: string
  startsAt: string
  endsAt: string
  allDay?: boolean
}) {
  const client = createOAuthClient()
  client.setCredentials({ access_token: params.accessToken })
  const cal = google.calendar({ version: 'v3', auth: client })

  const event = params.allDay
    ? {
        summary: params.title,
        description: params.description,
        location: params.location,
        start: { date: params.startsAt.split('T')[0] },
        end: { date: params.endsAt.split('T')[0] },
      }
    : {
        summary: params.title,
        description: params.description,
        location: params.location,
        start: { dateTime: params.startsAt, timeZone: 'Asia/Jerusalem' },
        end: { dateTime: params.endsAt, timeZone: 'Asia/Jerusalem' },
      }

  const res = await cal.events.insert({ calendarId: params.calendarId, requestBody: event })
  return res.data
}

export async function updateEvent(params: {
  accessToken: string
  calendarId: string
  eventId: string
  title?: string
  description?: string
  location?: string
  startsAt?: string
  endsAt?: string
  allDay?: boolean
}) {
  const client = createOAuthClient()
  client.setCredentials({ access_token: params.accessToken })
  const cal = google.calendar({ version: 'v3', auth: client })

  const patch: Record<string, unknown> = {}
  if (params.title) patch.summary = params.title
  if (params.description !== undefined) patch.description = params.description
  if (params.location !== undefined) patch.location = params.location
  if (params.startsAt) {
    patch.start = params.allDay
      ? { date: params.startsAt.split('T')[0] }
      : { dateTime: params.startsAt, timeZone: 'Asia/Jerusalem' }
  }
  if (params.endsAt) {
    patch.end = params.allDay
      ? { date: params.endsAt.split('T')[0] }
      : { dateTime: params.endsAt, timeZone: 'Asia/Jerusalem' }
  }

  const res = await cal.events.patch({
    calendarId: params.calendarId,
    eventId: params.eventId,
    requestBody: patch,
  })
  return res.data
}

export async function deleteEvent(params: {
  accessToken: string
  calendarId: string
  eventId: string
}) {
  const client = createOAuthClient()
  client.setCredentials({ access_token: params.accessToken })
  const cal = google.calendar({ version: 'v3', auth: client })
  await cal.events.delete({ calendarId: params.calendarId, eventId: params.eventId })
}

// Map Google Calendar event to CalendarItem shape
export function mapGoogleEventToItem(
  event: Awaited<ReturnType<typeof fetchCalendarEvents>>[0],
  familyId: string,
  integrationId: string,
  calendarDbId: string,
  calendarId: string
): Omit<CalendarItem, 'id' | 'created_at' | 'updated_at'> {
  const allDay = Boolean(event.start?.date && !event.start?.dateTime)
  const startsAt = allDay
    ? new Date(event.start!.date! + 'T00:00:00+02:00').toISOString()
    : event.start?.dateTime
      ? new Date(event.start.dateTime).toISOString()
      : null
  const endsAt = allDay
    ? new Date(event.end!.date! + 'T23:59:00+02:00').toISOString()
    : event.end?.dateTime
      ? new Date(event.end.dateTime).toISOString()
      : null

  const dedupeKey = `google_calendar:${integrationId}:${calendarId}:${event.id}`

  return {
    family_id: familyId,
    child_id: null,
    source_provider: 'google_calendar',
    source_type: 'event',
    source_integration_id: integrationId,
    source_calendar_id: calendarDbId,
    external_id: event.id ?? null,
    dedupe_key: dedupeKey,
    title: event.summary ?? '(ללא כותרת)',
    description: event.description ?? null,
    location: event.location ?? null,
    subject: null,
    teacher: null,
    starts_at: startsAt,
    ends_at: endsAt,
    due_at: null,
    all_day: allDay,
    status: event.status === 'cancelled' ? 'cancelled' : 'active',
    priority: null,
    color: event.colorId ?? null,
    visibility: 'family',
    is_editable: true,
    source_updated_at: event.updated ? new Date(event.updated).toISOString() : null,
    raw: event as unknown as Record<string, unknown>,
    created_by_profile_id: null,
    updated_by_profile_id: null,
  }
}

// Simple AES-256 encrypt/decrypt using env key
export function encryptToken(token: string): string {
  const { createCipheriv, randomBytes } = require('crypto')
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decryptToken(encrypted: string): string {
  const { createDecipheriv } = require('crypto')
  const [ivHex, encHex] = encrypted.split(':')
  const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const enc = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
