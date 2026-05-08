import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { mapHomeworkToItem, mapLessonToItem, mapExamToItem, mapParentApprovalToItem } from '@/lib/mashov/mapper'
import { RealMashovAdapter } from '@/lib/mashov/real-adapter'
import type { MashovAdapter } from '@/lib/mashov/types'
import { decryptToken } from '@/lib/google/calendar'
import { subMonths, addMonths, format } from 'date-fns'

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
    .select('id, encrypted_secret_ref, metadata')
    .eq('family_id', profile.family_id)
    .eq('provider', 'mashov')
    .single()

  if (!integration?.encrypted_secret_ref) {
    return NextResponse.json({ error: 'משוב לא מחובר' }, { status: 400 })
  }

  const { data: children } = await adminSupabase
    .from('children')
    .select('id, mashov_student_id, name')
    .eq('family_id', profile.family_id)
    .eq('active', true)
    .not('mashov_student_id', 'is', null)

  if (!children?.length) {
    return NextResponse.json({ error: 'אין ילדים מקושרים למשוב' }, { status: 400 })
  }

  const credentials = JSON.parse(decryptToken(integration.encrypted_secret_ref))
  const adapter: MashovAdapter = new RealMashovAdapter()
  const connectResult = await adapter.connect(credentials)
  if (!connectResult.success) {
    await adminSupabase.from('integrations').update({ status: 'error', last_error: connectResult.error }).eq('id', integration.id)
    return NextResponse.json({ error: connectResult.error }, { status: 400 })
  }

  const now = new Date()
  const from = format(subMonths(now, 1), 'yyyy-MM-dd')
  const to = format(addMonths(now, 12), 'yyyy-MM-dd')

  const results: Record<string, number> = {}
  const errors: string[] = []

  for (const child of children) {
    if (!child.mashov_student_id) continue
    const studentId = child.mashov_student_id

    try {
      const [homework, timetable, exams, approvals] = await Promise.all([
        adapter.fetchHomework({ studentId, from, to }),
        adapter.fetchTimetable({ studentId, from, to }),
        adapter.fetchExams({ studentId, from, to }),
        adapter.fetchParentApprovals({ studentId, from, to }),
      ])

      const items = [
        ...homework.map(hw => mapHomeworkToItem(hw, profile.family_id, child.id, integration.id)),
        ...timetable.map(l => mapLessonToItem(l, profile.family_id, child.id, integration.id)),
        ...exams.map(e => mapExamToItem(e, profile.family_id, child.id, integration.id)),
        ...approvals.map(a => mapParentApprovalToItem(a, profile.family_id, child.id, integration.id)),
      ]

      for (const item of items) {
        await adminSupabase
          .from('calendar_items')
          .upsert(item, { onConflict: 'dedupe_key' })
      }

      results[child.name] = items.length

      await adminSupabase.from('sync_logs').insert({
        family_id: profile.family_id,
        integration_id: integration.id,
        level: 'info',
        message: `סנכרן ${items.length} פריטים עבור ${child.name}`,
        metadata: { childId: child.id, studentId, count: items.length },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown'
      errors.push(`${child.name}: ${msg}`)
      await adminSupabase.from('sync_logs').insert({
        family_id: profile.family_id,
        integration_id: integration.id,
        level: 'error',
        message: `שגיאה בסנכרון עבור ${child.name}: ${msg}`,
        metadata: { childId: child.id },
      })
    }
  }

  const status = errors.length === children.length ? 'error' : 'connected'
  await adminSupabase
    .from('integrations')
    .update({ last_sync_at: new Date().toISOString(), status, last_error: errors.join('; ') || null })
    .eq('id', integration.id)

  return NextResponse.json({ results, errors })
}
