import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('home_maintenance_tasks')
    .select('*')
    .in('status', ['active'])
    .order('due_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id, role')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 401 })
  if (!['family_admin', 'parent'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, area, category, due_at, repeat_rule, notes } = body

  if (!title?.trim()) return NextResponse.json({ error: 'כותרת חסרה' }, { status: 400 })

  const { data, error } = await supabase
    .from('home_maintenance_tasks')
    .insert({
      family_id: profile.family_id,
      created_by_profile_id: profile.id,
      title: title.trim(),
      area: area || null,
      category: category || null,
      due_at: due_at || null,
      repeat_rule: repeat_rule || null,
      notes: notes || null,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
