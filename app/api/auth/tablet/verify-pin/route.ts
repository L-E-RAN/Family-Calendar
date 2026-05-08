import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

function hashPin(pin: string, familyId: string): string {
  return createHash('sha256').update(`${pin}:${familyId}`).digest('hex')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const pin: string = body.pin ?? ''

  const { data: family } = await supabase
    .from('families')
    .select('tablet_pin_hash')
    .eq('id', profile.family_id)
    .single()

  if (!family?.tablet_pin_hash) {
    return NextResponse.json({ error: 'No PIN set' }, { status: 400 })
  }

  const hash = hashPin(pin, profile.family_id)
  const valid = hash === family.tablet_pin_hash

  if (!valid) return NextResponse.json({ valid: false }, { status: 401 })
  return NextResponse.json({ valid: true })
}
