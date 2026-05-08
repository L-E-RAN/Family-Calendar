import type {
  MashovAdapter,
  MashovCredentials,
  MashovConnectionResult,
  MashovStudent,
  MashovHomework,
  MashovLesson,
  MashovExam,
  MashovParentApproval,
  MashovHealthStatus,
} from './types'

const BASE_URL = 'https://web.mashov.info'
const API_BASE = '/api'

// Mashov returns Hebrew date strings or ISO; normalize to YYYY-MM-DD
function normalizeDate(d: string | null | undefined): string | null {
  if (!d) return null
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

// Convert "HH:MM" lesson hour numbers to clock time
// Mashov lesson number → approximate start time
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

export class RealMashovAdapter implements MashovAdapter {
  private cookies: string = ''
  private csrfToken: string = ''
  private sessionUser: { semelMosad: number; year: number } | null = null
  private cachedStudents: MashovStudent[] = []

  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'x-requested-with': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/students/`,
    }
    if (this.cookies) headers['Cookie'] = this.cookies
    if (this.csrfToken) headers['x-csrf-token'] = this.csrfToken

    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    // Capture/update cookies
    const setCookie = res.headers.get('set-cookie')
    if (setCookie) {
      const existing = Object.fromEntries(
        this.cookies.split(';').map(c => c.trim().split('=', 2) as [string, string]).filter(p => p[0])
      )
      for (const part of setCookie.split(',')) {
        const pair = part.split(';')[0].trim()
        const [k, v] = pair.split('=', 2)
        if (k && v !== undefined) existing[k.trim()] = v.trim()
      }
      this.cookies = Object.entries(existing).map(([k, v]) => `${k}=${v}`).join('; ')
      const csrfEntry = Object.entries(existing).find(([k]) => k.toLowerCase().includes('csrf'))
      if (csrfEntry) this.csrfToken = csrfEntry[1]
    }

    // Capture CSRF token from response header (Mashov sends it as X-Csrf-Token)
    const csrfHeader = res.headers.get('x-csrf-token')
    if (csrfHeader) this.csrfToken = csrfHeader

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new Error(`Mashov API ${method} ${path} → ${res.status}: ${text}`)
    }

    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) return res.json()
    return res.text()
  }

  async connect(credentials: MashovCredentials): Promise<MashovConnectionResult> {
    try {
      const year = credentials.schoolYear ?? new Date().getFullYear()
      const semel = Number(credentials.schoolCode)
      if (isNaN(semel)) return { success: false, error: 'קוד בית ספר (סמל) חייב להיות מספר' }

      const data = await this.request('POST', `${API_BASE}/login`, {
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
      }) as {
        credential?: { semel?: number; year?: number }
        accessToken?: {
          children?: Array<{
            childGuid: string
            privateName: string
            familyName: string
            classCode: string
            classNum: number
          }>
          schoolSettings?: { schoolName?: string }
        }
      }

      this.sessionUser = { semelMosad: semel, year }

      // Cache children from login response (no separate /students endpoint needed)
      const children = data?.accessToken?.children ?? []
      const schoolName = data?.accessToken?.schoolSettings?.schoolName ?? ''
      this.cachedStudents = children.map(c => ({
        id: c.childGuid,
        name: `${c.privateName} ${c.familyName}`,
        classGrade: c.classCode,
        className: `${c.classCode}${c.classNum}`,
        schoolName,
        schoolCode: String(semel),
      }))

      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאת התחברות'
      return { success: false, error: msg }
    }
  }

  async listStudents(): Promise<MashovStudent[]> {
    return this.cachedStudents
  }

  async fetchHomework(params: { studentId: string; from: string; to: string }): Promise<MashovHomework[]> {
    const path = `${API_BASE}/students/${params.studentId}/homework?fromDate=${params.from}&toDate=${params.to}`
    const data = (await this.request('GET', path)) as Array<{
      homeworkId?: number | string
      lessonId?: number | string
      subject?: string
      teacherName?: string
      homeworkContent?: string
      lessonDate?: string
      dueDate?: string
      assignDate?: string
    }>

    return (Array.isArray(data) ? data : []).map(h => ({
      id: String(h.homeworkId ?? h.lessonId ?? Math.random()),
      studentId: params.studentId,
      subject: h.subject ?? '',
      teacher: h.teacherName ?? '',
      title: h.homeworkContent?.substring(0, 80) ?? 'שיעורי בית',
      description: h.homeworkContent ?? '',
      assignedAt: normalizeDate(h.assignDate ?? h.lessonDate) ?? params.from,
      dueAt: normalizeDate(h.dueDate),
      lessonDate: normalizeDate(h.lessonDate),
    })) satisfies MashovHomework[]
  }

  async fetchTimetable(params: { studentId: string; from: string; to: string }): Promise<MashovLesson[]> {
    const path = `${API_BASE}/students/${params.studentId}/timetable?fromDate=${params.from}&toDate=${params.to}`
    const data = (await this.request('GET', path)) as Array<{
      lessonDate?: string
      dayOfWeek?: number
      lesson?: number
      lessonNumber?: number
      subject?: string
      teacherName?: string
      roomName?: string
      classCode?: string
      startHour?: string
      endHour?: string
    }>

    return (Array.isArray(data) ? data : []).map(l => {
      const num = l.lessonNumber ?? l.lesson ?? 1
      const start = l.startHour ?? lessonNumToTime(num)
      const end = l.endHour ?? addMinutes(start, 45)
      return {
        studentId: params.studentId,
        date: normalizeDate(l.lessonDate) ?? params.from,
        lessonNumber: num,
        subject: l.subject ?? '',
        teacher: l.teacherName ?? '',
        room: l.roomName ?? l.classCode ?? null,
        startTime: start,
        endTime: end,
      }
    }) satisfies MashovLesson[]
  }

  async fetchExams(params: { studentId: string; from: string; to: string }): Promise<MashovExam[]> {
    // Try both known exam endpoints
    let data: unknown[] = []
    for (const path of [
      `${API_BASE}/students/${params.studentId}/maakavLimudim?fromDate=${params.from}&toDate=${params.to}`,
      `${API_BASE}/students/${params.studentId}/grades?fromDate=${params.from}&toDate=${params.to}`,
    ]) {
      try {
        const res = await this.request('GET', path)
        if (Array.isArray(res) && res.length > 0) { data = res; break }
      } catch { /* try next */ }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((e: {
      eventId?: number | string
      gradeId?: number | string
      subject?: string
      teacherName?: string
      gradeName?: string
      eventDate?: string
      gradeDate?: string
      startHour?: string
      description?: string
    }) => ({
      id: String(e.eventId ?? e.gradeId ?? Math.random()),
      studentId: params.studentId,
      subject: e.subject ?? '',
      teacher: e.teacherName ?? '',
      title: e.gradeName ?? 'מבחן',
      description: e.description ?? null,
      date: normalizeDate(e.eventDate ?? e.gradeDate) ?? params.from,
      startTime: e.startHour ?? null,
    })) satisfies MashovExam[]
  }

  async fetchParentApprovals(params: { studentId: string; from: string; to: string }): Promise<MashovParentApproval[]> {
    let data: unknown[] = []
    for (const path of [
      `${API_BASE}/students/${params.studentId}/hatzharotHorim`,
      `${API_BASE}/students/${params.studentId}/approvals`,
    ]) {
      try {
        const res = await this.request('GET', path)
        if (Array.isArray(res)) { data = res; break }
      } catch { /* try next */ }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map((a: {
      approvalId?: number | string
      hatzharaId?: number | string
      subject?: string
      description?: string
      content?: string
      startDate?: string
      endDate?: string
      url?: string
      mashovUrl?: string
      requiresSignature?: boolean
    }) => ({
      id: String(a.approvalId ?? a.hatzharaId ?? Math.random()),
      studentId: params.studentId,
      title: a.subject ?? 'אישור הורים',
      description: a.description ?? a.content ?? '',
      startDate: normalizeDate(a.startDate) ?? params.from,
      endDate: normalizeDate(a.endDate),
      requiresSignature: a.requiresSignature ?? true,
      mashovUrl: a.mashovUrl ?? a.url ?? null,
    })) satisfies MashovParentApproval[]
  }

  async healthCheck(): Promise<MashovHealthStatus> {
    const start = Date.now()
    try {
      const res = await fetch(`${BASE_URL}/`, { method: 'GET' })
      return { ok: res.ok || res.status < 500, latencyMs: Date.now() - start }
    } catch (err) {
      return { ok: false, latencyMs: Date.now() - start, error: err instanceof Error ? err.message : 'unreachable' }
    }
  }
}
