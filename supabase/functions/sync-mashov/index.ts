// Supabase Edge Function — sync Mashov for all families
// Triggered by Supabase Cron every 30 minutes
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!

const BASE_URL = 'https://web.mashov.info'
const API_BASE = '/api'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async (_req) => {
  try {
    const { data: integrations } = await supabase
      .from('integrations')
      .select('id, family_id, encrypted_secret_ref, status, metadata')
      .eq('provider', 'mashov')
      .in('status', ['connected', 'error'])

    if (!integrations?.length) {
      return new Response(JSON.stringify({ message: 'No active Mashov integrations' }), { status: 200 })
    }

    const allResults = []

    for (const integration of integrations) {
      try {
        if (!integration.encrypted_secret_ref) continue

        const credentials = JSON.parse(await decrypt(integration.encrypted_secret_ref))

        const session = await mashovConnect(credentials)
        if (!session.success) {
          await supabase
            .from('integrations')
            .update({ status: 'error', last_error: session.error })
            .eq('id', integration.id)
          continue
        }

        const { data: children } = await supabase
          .from('children')
          .select('id, mashov_student_id, name')
          .eq('family_id', integration.family_id)
          .eq('active', true)
          .not('mashov_student_id', 'is', null)

        if (!children?.length) continue

        const now = new Date()
        const from = formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000))
        const to = formatDate(new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000))

        const results: Record<string, number> = {}
        const errors: string[] = []

        for (const child of children) {
          if (!child.mashov_student_id) continue
          const studentId = child.mashov_student_id

          try {
            const [homework, timetable, exams, approvals] = await Promise.all([
              mashovFetchHomework(session.cookies, session.csrfToken, studentId, from, to),
              mashovFetchTimetable(session.cookies, session.csrfToken, studentId, from, to),
              mashovFetchExams(session.cookies, session.csrfToken, studentId, from, to),
              mashovFetchApprovals(session.cookies, session.csrfToken, studentId, from, to),
            ])

            const items = [
              ...await Promise.all(homework.map(hw => mapHomework(hw, integration.family_id, child.id, integration.id))),
              ...timetable.map(l => mapLesson(l, integration.family_id, child.id, integration.id)),
              ...await Promise.all(exams.map(e => mapExam(e, integration.family_id, child.id, integration.id))),
              ...await Promise.all(approvals.map(a => mapApproval(a, integration.family_id, child.id, integration.id))),
            ]

            for (const item of items) {
              await supabase.from('calendar_items').upsert(item, { onConflict: 'dedupe_key' })
            }

            results[child.name] = items.length

            await supabase.from('sync_logs').insert({
              family_id: integration.family_id,
              integration_id: integration.id,
              level: 'info',
              message: `סנכרן ${items.length} פריטים עבור ${child.name}`,
              metadata: { childId: child.id, studentId, count: items.length },
            })
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown'
            errors.push(`${child.name}: ${msg}`)
            await supabase.from('sync_logs').insert({
              family_id: integration.family_id,
              integration_id: integration.id,
              level: 'error',
              message: `שגיאה בסנכרון עבור ${child.name}: ${msg}`,
              metadata: { childId: child.id },
            })
          }
        }

        const status = errors.length > 0 && errors.length === children.length ? 'error' : 'connected'
        await supabase
          .from('integrations')
          .update({ last_sync_at: now.toISOString(), status, last_error: errors.join('; ') || null })
          .eq('id', integration.id)

        allResults.push({ familyId: integration.family_id, results, errors })
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
          message: `Mashov sync error: ${msg}`,
          metadata: {},
        })
      }
    }

    return new Response(JSON.stringify({ ok: true, results: allResults }), { status: 200 })
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})

// ─── Mashov API ───────────────────────────────────────────────────────────────

interface MashovSession {
  success: boolean
  cookies: string
  csrfToken: string
  error?: string
}

async function mashovConnect(credentials: { username: string; password: string; schoolCode: string; schoolYear?: number }): Promise<MashovSession> {
  try {
    const year = credentials.schoolYear ?? new Date().getFullYear()
    const semel = Number(credentials.schoolCode)
    if (isNaN(semel)) return { success: false, cookies: '', csrfToken: '', error: 'קוד בית ספר (סמל) חייב להיות מספר' }

    const res = await fetch(`${BASE_URL}${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-requested-with': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Origin': BASE_URL,
        'Referer': `${BASE_URL}/students/`,
      },
      body: JSON.stringify({
        semel,
        year,
        username: credentials.username,
        password: credentials.password,
        appName: 'info.mashov.students',
        apiVersion: '3.20210425',
        appVersion: '3.20210425',
        appBuild: '3.20210425',
        deviceUuid: 'web',
        devicePlatform: 'WEB',
        deviceManufacturer: 'web',
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      return { success: false, cookies: '', csrfToken: '', error: `Mashov login ${res.status}: ${text}` }
    }

    let cookies = ''
    let csrfToken = ''
    const setCookie = res.headers.get('set-cookie')
    if (setCookie) {
      const map: Record<string, string> = {}
      for (const part of setCookie.split(',')) {
        const pair = part.split(';')[0].trim()
        const [k, v] = pair.split('=', 2)
        if (k && v !== undefined) map[k.trim()] = v.trim()
      }
      cookies = Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ')
      const csrfEntry = Object.entries(map).find(([k]) => k.toLowerCase().includes('csrf'))
      if (csrfEntry) csrfToken = csrfEntry[1]
    }
    const csrfHeader = res.headers.get('x-csrf-token')
    if (csrfHeader) csrfToken = csrfHeader

    return { success: true, cookies, csrfToken }
  } catch (err) {
    return { success: false, cookies: '', csrfToken: '', error: err instanceof Error ? err.message : 'שגיאת התחברות' }
  }
}

async function mashovGet(cookies: string, csrfToken: string, path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/students/`,
      'Cookie': cookies,
      'x-csrf-token': csrfToken,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Mashov GET ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

async function mashovFetchHomework(cookies: string, csrf: string, studentId: string, from: string, to: string) {
  const data = await mashovGet(cookies, csrf, `${API_BASE}/students/${studentId}/homework?fromDate=${from}&toDate=${to}`) as unknown[]
  return (Array.isArray(data) ? data : []).map((h: Record<string, unknown>) => {
    const content = (h.homework ?? h.homeworkContent ?? h.remark ?? '') as string
    const subject = (h.subjectName ?? h.subject ?? '') as string
    return {
      id: String(h.homeworkId ?? h.lessonId ?? Math.random()),
      studentId,
      subject,
      teacher: (h.teacherName ?? '') as string,
      title: content.substring(0, 80) || subject || 'שיעורי בית',
      description: content,
      assignedAt: normalizeDate((h.assignDate ?? h.lessonDate) as string) ?? from,
      dueAt: normalizeDate(h.dueDate as string),
      lessonDate: normalizeDate(h.lessonDate as string),
      _raw: h,
    }
  })
}

async function mashovFetchTimetable(cookies: string, csrf: string, studentId: string, from: string, to: string) {
  const data = await mashovGet(cookies, csrf, `${API_BASE}/students/${studentId}/timetable?fromDate=${from}&toDate=${to}`) as unknown[]
  return (Array.isArray(data) ? data : []).map((l: Record<string, unknown>) => {
    const num = (l.lessonNumber ?? l.lesson ?? 1) as number
    const start = (l.startHour ?? lessonNumToTime(num)) as string
    const end = (l.endHour ?? addMinutes(start, 45)) as string
    return {
      studentId,
      date: normalizeDate(l.lessonDate as string) ?? from,
      lessonNumber: num,
      subject: (l.subject ?? '') as string,
      teacher: (l.teacherName ?? '') as string,
      room: (l.roomName ?? l.classCode ?? null) as string | null,
      startTime: start,
      endTime: end,
    }
  })
}

async function mashovFetchExams(cookies: string, csrf: string, studentId: string, from: string, to: string) {
  let data: unknown[] = []
  for (const path of [
    `${API_BASE}/students/${studentId}/maakavLimudim?fromDate=${from}&toDate=${to}`,
    `${API_BASE}/students/${studentId}/grades?fromDate=${from}&toDate=${to}`,
  ]) {
    try {
      const res = await mashovGet(cookies, csrf, path)
      if (Array.isArray(res) && res.length > 0) { data = res; break }
    } catch { /* try next */ }
  }
  return (data as Record<string, unknown>[]).map(e => ({
    id: String(e.eventId ?? e.gradeId ?? Math.random()),
    studentId,
    subject: (e.subject ?? '') as string,
    teacher: (e.teacherName ?? '') as string,
    title: (e.gradeName ?? 'מבחן') as string,
    description: (e.description ?? null) as string | null,
    date: normalizeDate((e.eventDate ?? e.gradeDate) as string) ?? from,
    startTime: (e.startHour ?? null) as string | null,
  }))
}

async function mashovFetchApprovals(cookies: string, csrf: string, studentId: string, from: string, _to: string) {
  let data: unknown[] = []
  for (const path of [
    `${API_BASE}/students/${studentId}/hatzharotHorim`,
    `${API_BASE}/students/${studentId}/approvals`,
  ]) {
    try {
      const res = await mashovGet(cookies, csrf, path)
      if (Array.isArray(res)) { data = res; break }
    } catch { /* try next */ }
  }
  return (data as Record<string, unknown>[]).map(a => ({
    id: String(a.approvalId ?? a.hatzharaId ?? Math.random()),
    studentId,
    title: (a.subject ?? 'אישור הורים') as string,
    description: (a.description ?? a.content ?? '') as string,
    startDate: normalizeDate(a.startDate as string) ?? from,
    endDate: normalizeDate(a.endDate as string),
    requiresSignature: (a.requiresSignature ?? true) as boolean,
    mashovUrl: (a.mashovUrl ?? a.url ?? null) as string | null,
  }))
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

type MashovItem = Record<string, unknown>

async function mapHomework(hw: MashovItem, familyId: string, childId: string, integrationId: string) {
  const id = hw.id as string
  const studentId = hw.studentId as string
  const dupe = id
    ? `mashov_homework:${studentId}:${id}`
    : `mashov_homework:${studentId}:${await shortHash((hw.subject as string) + (hw.dueAt as string ?? '') + (hw.title as string))}`
  return {
    family_id: familyId, child_id: childId,
    source_provider: 'mashov', source_type: 'homework',
    source_integration_id: integrationId, source_calendar_id: null,
    external_id: id, dedupe_key: dupe,
    title: hw.title as string,
    description: (hw.description as string) || null,
    location: null, subject: hw.subject as string, teacher: hw.teacher as string,
    starts_at: null, ends_at: null,
    due_at: hw.dueAt
      ? new Date((hw.dueAt as string) + 'T23:59:00+02:00').toISOString()
      : hw.lessonDate
        ? new Date((hw.lessonDate as string) + 'T23:59:00+02:00').toISOString()
        : null,
    all_day: true, status: 'active', priority: null, color: null,
    visibility: 'family', is_editable: false,
    source_updated_at: hw.assignedAt ? new Date(hw.assignedAt as string).toISOString() : null,
    raw: (hw._raw ?? hw) as Record<string, unknown>,
    created_by_profile_id: null, updated_by_profile_id: null,
    points_value: 0, penalty_points: 0, deadline_time: null,
    requires_parent_approval: false, reward_enabled: false,
  }
}

function mapLesson(lesson: MashovItem, familyId: string, childId: string, integrationId: string) {
  const dupe = `mashov_lesson:${lesson.studentId}:${lesson.date}:${lesson.lessonNumber}:${lesson.subject}:${lesson.teacher}`
  return {
    family_id: familyId, child_id: childId,
    source_provider: 'mashov', source_type: 'lesson',
    source_integration_id: integrationId, source_calendar_id: null,
    external_id: null, dedupe_key: dupe,
    title: lesson.subject as string,
    description: null, location: lesson.room as string | null,
    subject: lesson.subject as string, teacher: lesson.teacher as string,
    starts_at: new Date(`${lesson.date}T${lesson.startTime}:00+02:00`).toISOString(),
    ends_at: new Date(`${lesson.date}T${lesson.endTime}:00+02:00`).toISOString(),
    due_at: null, all_day: false, status: 'active', priority: null, color: null,
    visibility: 'family', is_editable: false, source_updated_at: null,
    raw: lesson as Record<string, unknown>,
    created_by_profile_id: null, updated_by_profile_id: null,
    points_value: 0, penalty_points: 0, deadline_time: null,
    requires_parent_approval: false, reward_enabled: false,
  }
}

async function mapExam(exam: MashovItem, familyId: string, childId: string, integrationId: string) {
  const id = exam.id as string
  const studentId = exam.studentId as string
  const dupe = id
    ? `mashov_exam:${studentId}:${id}`
    : `mashov_exam:${studentId}:${await shortHash((exam.subject as string) + (exam.date as string) + (exam.title as string))}`
  const startsAt = exam.startTime
    ? new Date(`${exam.date}T${exam.startTime}:00+02:00`).toISOString()
    : new Date(`${exam.date}T09:00:00+02:00`).toISOString()
  return {
    family_id: familyId, child_id: childId,
    source_provider: 'mashov', source_type: 'exam',
    source_integration_id: integrationId, source_calendar_id: null,
    external_id: id, dedupe_key: dupe,
    title: exam.title as string,
    description: (exam.description as string) || null,
    location: null, subject: exam.subject as string, teacher: exam.teacher as string,
    starts_at: startsAt, ends_at: null, due_at: startsAt,
    all_day: false, status: 'needs_action', priority: 'high', color: null,
    visibility: 'family', is_editable: false, source_updated_at: null,
    raw: exam as Record<string, unknown>,
    created_by_profile_id: null, updated_by_profile_id: null,
    points_value: 0, penalty_points: 0, deadline_time: null,
    requires_parent_approval: false, reward_enabled: false,
  }
}

async function mapApproval(approval: MashovItem, familyId: string, childId: string, integrationId: string) {
  const id = approval.id as string
  const studentId = approval.studentId as string
  const dupe = id
    ? `mashov_parent_approval:${studentId}:${id}`
    : `mashov_parent_approval:${studentId}:${await shortHash((approval.title as string) + (approval.startDate as string))}`
  return {
    family_id: familyId, child_id: childId,
    source_provider: 'mashov', source_type: 'parent_approval',
    source_integration_id: integrationId, source_calendar_id: null,
    external_id: id, dedupe_key: dupe,
    title: approval.title as string,
    description: approval.description as string,
    location: null, subject: null, teacher: null,
    starts_at: new Date((approval.startDate as string) + 'T07:00:00+02:00').toISOString(),
    ends_at: approval.endDate ? new Date((approval.endDate as string) + 'T23:59:00+02:00').toISOString() : null,
    due_at: new Date((approval.startDate as string) + 'T07:00:00+02:00').toISOString(),
    all_day: true, status: 'needs_action', priority: 'high', color: null,
    visibility: 'parents_only', is_editable: false, source_updated_at: null,
    raw: approval as Record<string, unknown>,
    created_by_profile_id: null, updated_by_profile_id: null,
    points_value: 0, penalty_points: 0, deadline_time: null,
    requires_parent_approval: false, reward_enabled: false,
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function normalizeDate(d: string | null | undefined): string | null {
  if (!d) return null
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

function lessonNumToTime(num: number): string {
  const schedule: Record<number, string> = {
    1: '07:30', 2: '08:20', 3: '09:15', 4: '10:10', 5: '11:05',
    6: '12:00', 7: '12:50', 8: '13:40', 9: '14:30', 10: '15:20',
    11: '16:10', 12: '17:00',
  }
  return schedule[num] ?? `${7 + Math.floor(num * 0.8)}:00`
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function shortHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 12)
}

async function decrypt(encrypted: string): Promise<string> {
  const [ivHex, encHex] = encrypted.split(':')
  const key = hexToBytes(ENCRYPTION_KEY)
  const iv = hexToBytes(ivHex)
  const enc = hexToBytes(encHex)
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, enc)
  return new TextDecoder().decode(decrypted)
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) arr[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  return arr
}
