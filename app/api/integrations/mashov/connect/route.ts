import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { RealMashovAdapter } from '@/lib/mashov/real-adapter'
import { encryptToken } from '@/lib/google/calendar'
import type { MashovStudent } from '@/lib/mashov/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile || profile.role !== 'family_admin') {
    return NextResponse.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 })
  }

  const body = await request.json()
  const { username, password, schoolCode, schoolYear } = body
  if (!username || !password || !schoolCode) {
    return NextResponse.json({ error: 'שדות חסרים' }, { status: 400 })
  }

  const adapter = new RealMashovAdapter()
  const result = await adapter.connect({ username, password, schoolCode, schoolYear })

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'שגיאת התחברות למשוב' }, { status: 400 })
  }

  const students = await adapter.listStudents()
  const encryptedCredentials = encryptToken(JSON.stringify({ username, password, schoolCode, schoolYear }))

  const adminSupabase = await createAdminClient()

  // Auto-link Mashov students to children by first name match
  const { data: children } = await adminSupabase
    .from('children')
    .select('id, name')
    .eq('family_id', profile.family_id)

  const linkedStudents: Array<{ childId: string; studentId: string; name: string }> = []
  if (children) {
    for (const student of students) {
      // Match by first name (Mashov full name contains first + family name)
      const match = children.find(c => {
        const firstName = c.name.split(' ')[0]
        return student.name.includes(firstName) || firstName.includes(student.name.split(' ')[0])
      })
      if (match) {
        await adminSupabase
          .from('children')
          .update({ mashov_student_id: student.id })
          .eq('id', match.id)
        linkedStudents.push({ childId: match.id, studentId: student.id, name: student.name })
      }
    }
  }

  const { data: integration } = await adminSupabase
    .from('integrations')
    .upsert({
      family_id: profile.family_id,
      owner_profile_id: profile.id,
      provider: 'mashov',
      display_name: 'משוב',
      status: 'connected',
      encrypted_secret_ref: encryptedCredentials,
      metadata: {
        schoolCode,
        students: students.map((s: MashovStudent) => ({ id: s.id, name: s.name, grade: s.classGrade })),
        linkedStudents,
      },
      last_error: null,
    }, { onConflict: 'family_id,provider' })
    .select()
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'שגיאה בשמירת חיבור' }, { status: 500 })
  }

  await adminSupabase.from('sync_logs').insert({
    family_id: profile.family_id,
    integration_id: integration.id,
    level: 'info',
    message: `Mashov connected — ${students.length} students, ${linkedStudents.length} linked to children`,
    metadata: { studentsCount: students.length, linkedStudents },
  })

  return NextResponse.json({ success: true, students, linkedStudents })
}
