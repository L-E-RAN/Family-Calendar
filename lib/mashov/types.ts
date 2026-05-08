export interface MashovCredentials {
  username: string
  password: string
  schoolCode: string
  schoolYear?: number
}

export interface MashovConnectionResult {
  success: boolean
  sessionToken?: string
  error?: string
}

export interface MashovStudent {
  id: string
  name: string
  classGrade: string
  className: string
  schoolName: string
  schoolCode: string
}

export interface MashovHomework {
  id: string
  studentId: string
  subject: string
  teacher: string
  title: string
  description: string
  assignedAt: string
  dueAt: string | null
  lessonDate: string | null
}

export interface MashovLesson {
  studentId: string
  date: string
  lessonNumber: number
  subject: string
  teacher: string
  room: string | null
  startTime: string
  endTime: string
}

export interface MashovExam {
  id: string
  studentId: string
  subject: string
  teacher: string
  title: string
  description: string | null
  date: string
  startTime: string | null
}

export interface MashovParentApproval {
  id: string
  studentId: string
  title: string
  description: string
  startDate: string
  endDate: string | null
  requiresSignature: boolean
  mashovUrl: string | null
}

export interface MashovHealthStatus {
  ok: boolean
  latencyMs: number
  error?: string
}

export interface MashovAdapter {
  connect(input: MashovCredentials): Promise<MashovConnectionResult>
  listStudents(): Promise<MashovStudent[]>
  fetchHomework(params: { studentId: string; from: string; to: string }): Promise<MashovHomework[]>
  fetchTimetable(params: { studentId: string; from: string; to: string }): Promise<MashovLesson[]>
  fetchExams(params: { studentId: string; from: string; to: string }): Promise<MashovExam[]>
  fetchParentApprovals(params: { studentId: string; from: string; to: string }): Promise<MashovParentApproval[]>
  healthCheck(): Promise<MashovHealthStatus>
}
