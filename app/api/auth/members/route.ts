import { NextResponse } from 'next/server'
import { createAuthAdminClient } from '@/lib/supabase/admin'

// Public endpoint — powers the login name picker. No auth required.
// Returns display names + internal emails (opaque to users).
export async function GET() {
  const admin = createAuthAdminClient()

  const [{ data: profiles }, { data: { users } }] = await Promise.all([
    admin.from('profiles').select('auth_user_id, display_name').order('display_name'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailByAuthId = Object.fromEntries(users.map(u => [u.id, u.email ?? '']))

  const members = (profiles ?? []).map(p => ({
    display_name: p.display_name,
    email: emailByAuthId[p.auth_user_id] ?? '',
  }))

  return NextResponse.json({ members })
}
