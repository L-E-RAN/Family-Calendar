import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const listId = searchParams.get('list_id')

  let query = supabase
    .from('shopping_items')
    .select('*, added_by:added_by_profile_id(id,display_name), completed_by:completed_by_profile_id(id,display_name)')
    .order('status', { ascending: true })
    .order('created_at', { ascending: true })

  if (listId) query = query.eq('list_id', listId)

  const { data, error } = await query
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
  const { title, list_id, quantity, category } = body

  if (!title?.trim()) return NextResponse.json({ error: 'שם הפריט חסר' }, { status: 400 })
  if (!list_id) return NextResponse.json({ error: 'list_id חסר' }, { status: 400 })

  const { data, error } = await supabase
    .from('shopping_items')
    .insert({
      family_id: profile.family_id,
      list_id,
      title: title.trim(),
      quantity: quantity ?? null,
      category: category ?? null,
      added_by_profile_id: profile.id,
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
