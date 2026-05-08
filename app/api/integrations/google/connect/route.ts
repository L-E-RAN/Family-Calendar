import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUrl } from '@/lib/google/calendar'
import { randomBytes } from 'crypto'

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

  const state = randomBytes(16).toString('hex')
  // Store state in cookie for verification in callback
  const response = NextResponse.json({ url: getAuthUrl(state) })
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    sameSite: 'lax',
  })
  response.cookies.set('google_oauth_profile_id', profile.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    sameSite: 'lax',
  })
  return response
}
