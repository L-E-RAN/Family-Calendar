import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, family_id')
    .eq('auth_user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ family_id: existing.family_id })
  }

  const body = await request.json()
  const adminSupabase = await createAdminClient()

  // Check if there's already a family (join existing)
  // For this private app, there's only one family — always reuse it
  const { data: existingFamily } = await adminSupabase
    .from('families')
    .select('id')
    .limit(1)
    .single()

  if (existingFamily) {
    return NextResponse.json({ family_id: existingFamily.id })
  }

  // Create the family
  const { data: family, error } = await adminSupabase
    .from('families')
    .insert({ name: body.name || 'משפחת אשואל', timezone: 'Asia/Jerusalem' })
    .select()
    .single()

  if (error || !family) {
    return NextResponse.json({ error: error?.message || 'Failed to create family' }, { status: 500 })
  }

  return NextResponse.json({ family_id: family.id })
}
