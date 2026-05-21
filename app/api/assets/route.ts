import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('home_assets')
    .select('*')
    .order('name', { ascending: true })

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
  const { name, category, brand, model, serial_number, purchase_date, purchase_store, purchase_price, warranty_until, notes } = body

  if (!name?.trim()) return NextResponse.json({ error: 'שם המוצר חסר' }, { status: 400 })

  const { data, error } = await supabase
    .from('home_assets')
    .insert({
      family_id: profile.family_id,
      created_by_profile_id: profile.id,
      name: name.trim(),
      category: category || null,
      brand: brand || null,
      model: model || null,
      serial_number: serial_number || null,
      purchase_date: purchase_date || null,
      purchase_store: purchase_store || null,
      purchase_price: purchase_price ? Number(purchase_price) : null,
      warranty_until: warranty_until || null,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
