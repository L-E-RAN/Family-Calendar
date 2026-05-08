import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { endpoint, p256dh, auth, deviceName } = body

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'נתוני התראה חסרים' }, { status: 400 })
  }

  const userAgent = request.headers.get('user-agent') || null

  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert({
      family_id: profile.family_id,
      profile_id: profile.id,
      endpoint,
      p256dh,
      auth,
      user_agent: userAgent,
      device_name: deviceName || null,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ subscription: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, family_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const { endpoint } = body

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('profile_id', profile.id)

  return NextResponse.json({ success: true })
}
