import { createHash } from 'crypto'
import type { MashovHomework, MashovLesson, MashovExam, MashovParentApproval } from './types'
import type { CalendarItem } from '@/types'

function hash(input: string): string {
  return createHash('md5').update(input).digest('hex').slice(0, 12)
}

export function mapHomeworkToItem(
  hw: MashovHomework,
  familyId: string,
  childId: string,
  integrationId: string
): Omit<CalendarItem, 'id' | 'created_at' | 'updated_at'> {
  const dedupeKey = hw.id
    ? `mashov_homework:${hw.studentId}:${hw.id}`
    : `mashov_homework:${hw.studentId}:${hash(hw.subject + (hw.dueAt ?? '') + hw.title)}`

  return {
    family_id: familyId,
    child_id: childId,
    source_provider: 'mashov',
    source_type: 'homework',
    source_integration_id: integrationId,
    source_calendar_id: null,
    external_id: hw.id,
    dedupe_key: dedupeKey,
    title: hw.title,
    description: hw.description || null,
    location: null,
    subject: hw.subject,
    teacher: hw.teacher,
    starts_at: null,
    ends_at: null,
    due_at: hw.dueAt
      ? new Date(hw.dueAt + 'T23:59:00+02:00').toISOString()
      : hw.lessonDate
        ? new Date(hw.lessonDate + 'T23:59:00+02:00').toISOString()
        : null,
    all_day: true,
    status: 'active',
    priority: null,
    color: null,
    visibility: 'family',
    is_editable: false,
    source_updated_at: hw.assignedAt ? new Date(hw.assignedAt).toISOString() : null,
    raw: hw as unknown as Record<string, unknown>,
    created_by_profile_id: null,
    updated_by_profile_id: null,
  }
}

export function mapLessonToItem(
  lesson: MashovLesson,
  familyId: string,
  childId: string,
  integrationId: string
): Omit<CalendarItem, 'id' | 'created_at' | 'updated_at'> {
  const dedupeKey = `mashov_lesson:${lesson.studentId}:${lesson.date}:${lesson.lessonNumber}:${lesson.subject}:${lesson.teacher}`

  const startsAt = new Date(`${lesson.date}T${lesson.startTime}:00+02:00`).toISOString()
  const endsAt = new Date(`${lesson.date}T${lesson.endTime}:00+02:00`).toISOString()

  return {
    family_id: familyId,
    child_id: childId,
    source_provider: 'mashov',
    source_type: 'lesson',
    source_integration_id: integrationId,
    source_calendar_id: null,
    external_id: null,
    dedupe_key: dedupeKey,
    title: lesson.subject,
    description: null,
    location: lesson.room,
    subject: lesson.subject,
    teacher: lesson.teacher,
    starts_at: startsAt,
    ends_at: endsAt,
    due_at: null,
    all_day: false,
    status: 'active',
    priority: null,
    color: null,
    visibility: 'family',
    is_editable: false,
    source_updated_at: null,
    raw: lesson as unknown as Record<string, unknown>,
    created_by_profile_id: null,
    updated_by_profile_id: null,
  }
}

export function mapExamToItem(
  exam: MashovExam,
  familyId: string,
  childId: string,
  integrationId: string
): Omit<CalendarItem, 'id' | 'created_at' | 'updated_at'> {
  const dedupeKey = exam.id
    ? `mashov_exam:${exam.studentId}:${exam.id}`
    : `mashov_exam:${exam.studentId}:${hash(exam.subject + exam.date + exam.title)}`

  const startsAt = exam.startTime
    ? new Date(`${exam.date}T${exam.startTime}:00+02:00`).toISOString()
    : new Date(`${exam.date}T09:00:00+02:00`).toISOString()

  return {
    family_id: familyId,
    child_id: childId,
    source_provider: 'mashov',
    source_type: 'exam',
    source_integration_id: integrationId,
    source_calendar_id: null,
    external_id: exam.id,
    dedupe_key: dedupeKey,
    title: exam.title,
    description: exam.description || null,
    location: null,
    subject: exam.subject,
    teacher: exam.teacher,
    starts_at: startsAt,
    ends_at: null,
    due_at: startsAt,
    all_day: false,
    status: 'needs_action',
    priority: 'high',
    color: null,
    visibility: 'family',
    is_editable: false,
    source_updated_at: null,
    raw: exam as unknown as Record<string, unknown>,
    created_by_profile_id: null,
    updated_by_profile_id: null,
  }
}

export function mapParentApprovalToItem(
  approval: MashovParentApproval,
  familyId: string,
  childId: string,
  integrationId: string
): Omit<CalendarItem, 'id' | 'created_at' | 'updated_at'> {
  const dedupeKey = approval.id
    ? `mashov_parent_approval:${approval.studentId}:${approval.id}`
    : `mashov_parent_approval:${approval.studentId}:${hash(approval.title + approval.startDate)}`

  return {
    family_id: familyId,
    child_id: childId,
    source_provider: 'mashov',
    source_type: 'parent_approval',
    source_integration_id: integrationId,
    source_calendar_id: null,
    external_id: approval.id,
    dedupe_key: dedupeKey,
    title: approval.title,
    description: approval.description,
    location: null,
    subject: null,
    teacher: null,
    starts_at: new Date(approval.startDate + 'T07:00:00+02:00').toISOString(),
    ends_at: approval.endDate
      ? new Date(approval.endDate + 'T23:59:00+02:00').toISOString()
      : null,
    due_at: new Date(approval.startDate + 'T07:00:00+02:00').toISOString(),
    all_day: true,
    status: 'needs_action',
    priority: 'high',
    color: null,
    visibility: 'parents_only',
    is_editable: false,
    source_updated_at: null,
    raw: approval as unknown as Record<string, unknown>,
    created_by_profile_id: null,
    updated_by_profile_id: null,
  }
}
