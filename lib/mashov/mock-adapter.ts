import { addDays, format, startOfDay } from 'date-fns'
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

const MOCK_STUDENTS: MashovStudent[] = [
  {
    id: 'student-1',
    name: 'ילד א',
    classGrade: '4',
    className: 'ד1',
    schoolName: 'בית ספר יסודי',
    schoolCode: '12345',
  },
  {
    id: 'student-2',
    name: 'ילד ב',
    classGrade: '6',
    className: 'ו2',
    schoolName: 'בית ספר יסודי',
    schoolCode: '12345',
  },
]

export class MockMashovAdapter implements MashovAdapter {
  private connected = false

  async connect(_input: MashovCredentials): Promise<MashovConnectionResult> {
    await delay(300)
    this.connected = true
    return { success: true, sessionToken: 'mock-session-token-xyz' }
  }

  async listStudents(): Promise<MashovStudent[]> {
    await delay(200)
    return MOCK_STUDENTS
  }

  async fetchHomework(params: { studentId: string; from: string; to: string }): Promise<MashovHomework[]> {
    await delay(300)
    const today = new Date()
    const subjects = ['מתמטיקה', 'עברית', 'אנגלית', 'מדעים', 'היסטוריה', 'גיאוגרפיה']
    const teachers = ['רחל כהן', 'דוד לוי', 'שרה גרין', 'משה דוד', 'מרים עובד']

    return Array.from({ length: 4 }).map((_, i) => ({
      id: `hw-${params.studentId}-${i}`,
      studentId: params.studentId,
      subject: subjects[i % subjects.length],
      teacher: teachers[i % teachers.length],
      title: `שיעורי בית - ${subjects[i % subjects.length]}`,
      description: `לפתור תרגילים בפרק ${i + 3}`,
      assignedAt: format(today, 'yyyy-MM-dd'),
      dueAt: format(addDays(today, i + 1), 'yyyy-MM-dd'),
      lessonDate: format(addDays(today, i), 'yyyy-MM-dd'),
    }))
  }

  async fetchTimetable(params: { studentId: string; from: string; to: string }): Promise<MashovLesson[]> {
    await delay(300)
    const from = new Date(params.from)
    const lessons: MashovLesson[] = []
    const subjectsByStudent: Record<string, string[]> = {
      'student-1': ['מתמטיקה', 'עברית', 'חינוך גופני', 'מדעים', 'אנגלית', 'אמנות'],
      'student-2': ['אנגלית', 'מתמטיקה', 'היסטוריה', 'ספרות', 'כימיה', 'ספורט'],
    }
    const teachers: Record<string, string[]> = {
      'student-1': ['רחל כהן', 'יוסי מזרחי', 'אבי שלום', 'טל דוד', 'שרה גרין', 'מירי כץ'],
      'student-2': ['שרה גרין', 'רחל כהן', 'נועה פרץ', 'דוד לוי', 'יעל מור', 'רון שמיר'],
    }

    const studentSubjects = subjectsByStudent[params.studentId] || subjectsByStudent['student-1']
    const studentTeachers = teachers[params.studentId] || teachers['student-1']

    for (let day = 0; day < 7; day++) {
      const date = addDays(from, day)
      const dayOfWeek = date.getDay()
      if (dayOfWeek === 5 || dayOfWeek === 6) continue // skip Friday + Saturday

      for (let lesson = 0; lesson < 6; lesson++) {
        const startHour = 8 + lesson
        lessons.push({
          studentId: params.studentId,
          date: format(date, 'yyyy-MM-dd'),
          lessonNumber: lesson + 1,
          subject: studentSubjects[lesson % studentSubjects.length],
          teacher: studentTeachers[lesson % studentTeachers.length],
          room: `כיתה ${Math.floor(Math.random() * 10) + 1}`,
          startTime: `${String(startHour).padStart(2, '0')}:00`,
          endTime: `${String(startHour).padStart(2, '0')}:45`,
        })
      }
    }

    return lessons
  }

  async fetchExams(params: { studentId: string; from: string; to: string }): Promise<MashovExam[]> {
    await delay(200)
    const today = new Date()
    return [
      {
        id: `exam-${params.studentId}-1`,
        studentId: params.studentId,
        subject: 'מתמטיקה',
        teacher: 'רחל כהן',
        title: 'מבחן מתמטיקה - פרקים 3-5',
        description: 'מספרים שלמים, שברים, אחוזים',
        date: format(addDays(today, 7), 'yyyy-MM-dd'),
        startTime: '09:00',
      },
      {
        id: `exam-${params.studentId}-2`,
        studentId: params.studentId,
        subject: 'אנגלית',
        teacher: 'שרה גרין',
        title: 'מבחן אנגלית - מילים ודקדוק',
        description: null,
        date: format(addDays(today, 14), 'yyyy-MM-dd'),
        startTime: '10:00',
      },
    ]
  }

  async fetchParentApprovals(params: { studentId: string; from: string; to: string }): Promise<MashovParentApproval[]> {
    await delay(200)
    const today = new Date()
    return [
      {
        id: `approval-${params.studentId}-1`,
        studentId: params.studentId,
        title: 'טיול שנתי לירושלים',
        description: 'אנא אשרו השתתפות ילדכם בטיול השנתי לירושלים. עלות: 80 ש"ח. צהריים: ארוז.',
        startDate: format(addDays(today, 4), 'yyyy-MM-dd'),
        endDate: format(addDays(today, 4), 'yyyy-MM-dd'),
        requiresSignature: true,
        mashovUrl: null,
      },
    ]
  }

  async healthCheck(): Promise<MashovHealthStatus> {
    const start = Date.now()
    await delay(50)
    return { ok: true, latencyMs: Date.now() - start }
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
