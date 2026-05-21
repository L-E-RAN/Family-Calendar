import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('family_inbox_items')
    .select('*')
    .in('status', ['inbox', 'triaged'])
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 401 })

  const body = await req.json()
  const { title, raw_input, body: itemBody } = body

  if (!title?.trim()) return NextResponse.json({ error: 'כותרת חסרה' }, { status: 400 })

  const { data, error } = await supabase
    .from('family_inbox_items')
    .insert({
      family_id: profile.family_id,
      created_by_profile_id: profile.id,
      title: title.trim(),
      body: itemBody ?? null,
      raw_input: raw_input ?? title.trim(),
      status: 'inbox',
      source: 'manual',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
