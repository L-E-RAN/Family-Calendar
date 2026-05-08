import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Google Calendar push notification webhook
// Marks the integration as dirty to trigger sync
export async function POST(request: NextRequest) {
  const channelId = request.headers.get('x-goog-channel-id')
  const resourceId = request.headers.get('x-goog-resource-id')
  const resourceState = request.headers.get('x-goog-resource-state')
  const channelToken = request.headers.get('x-goog-channel-token')

  // Validate channel token if configured
  const expectedToken = process.env.GOOGLE_WEBHOOK_TOKEN
  if (expectedToken && channelToken !== expectedToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Ignore sync messages (initial subscription confirmation)
  if (resourceState === 'sync') {
    return NextResponse.json({ ok: true })
  }

  if (!channelId || !resourceId) {
    return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
  }

  try {
    const adminSupabase = await createAdminClient()

    // Find the external calendar by watch channel
    const { data: calendar } = await adminSupabase
      .from('external_calendars')
      .select('id, integration_id, family_id:integrations(family_id)')
      .eq('watch_channel_id', channelId)
      .single()

    if (calendar) {
      // Mark integration as needing sync (set metadata flag)
      await adminSupabase
        .from('integrations')
        .update({ metadata: { dirty: true, dirtyAt: new Date().toISOString() } })
        .eq('id', calendar.integration_id)

      await adminSupabase.from('sync_logs').insert({
        family_id: (calendar.family_id as unknown as { family_id: string })?.family_id,
        integration_id: calendar.integration_id,
        level: 'info',
        message: 'Google Calendar webhook received — marked dirty for sync',
        metadata: { channelId, resourceId, resourceState },
      })
    }
  } catch {
    // Don't return errors to Google — always 200
  }

  return NextResponse.json({ ok: true })
}
