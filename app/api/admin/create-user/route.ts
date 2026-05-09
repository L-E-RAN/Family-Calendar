import { NextRequest, NextResponse } from 'next/server'
import { createAuthAdminClient } from '@/lib/supabase/admin'

// One-time admin endpoint for creating tablet-only accounts.
// Protected by ADMIN_SECRET env var.
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret')
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, password, display_name } = await request.json()
  if (!email || !password || !display_name) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const admin = createAuthAdminClient()

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
  const userId = authData.user.id

  // Get (or create) the family
  const { data: family } = await admin.from('families').select('id').limit(1).single()
  if (!family) return NextResponse.json({ error: 'No family found' }, { status: 500 })

  // Create profile with tablet_only = true
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .insert({
      auth_user_id: userId,
      family_id: family.id,
      display_name,
      role: 'parent',
      tablet_only: true,
    })
    .select()
    .single()

  if (profileError) {
    // Clean up auth user on failure
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ user_id: userId, profile_id: profile.id })
}
