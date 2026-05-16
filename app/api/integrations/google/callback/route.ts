import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { exchangeCode, findFamilyCalendar, encryptToken } from '@/lib/google/calendar'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const cookieStore = await cookies()
  const storedState = cookieStore.get('google_oauth_state')?.value
  const profileId = cookieStore.get('google_oauth_profile_id')?.value

  if (error) {
    return NextResponse.redirect(new URL('/settings/integrations?error=google_denied', request.url))
  }

  if (!code || !state || state !== storedState || !profileId) {
    console.error('Google callback state mismatch', { hasCode: !!code, hasState: !!state, stateMatch: state === storedState, hasProfileId: !!profileId, storedState, incomingState: state })
    return NextResponse.redirect(new URL('/settings/integrations?error=invalid_state', request.url))
  }

  const adminSupabase = await createAdminClient()
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('id, family_id')
    .eq('id', profileId)
    .single()

  if (!profile) {
    return NextResponse.redirect(new URL('/settings/integrations?error=invalid_profile', request.url))
  }

  try {
    const tokens = await exchangeCode(code)
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL('/settings/integrations?error=no_refresh_token', request.url))
    }

    const encryptedRef = encryptToken(tokens.refresh_token)

    // Create or update Google integration
    const { data: integration, error: intError } = await adminSupabase
      .from('integrations')
      .upsert({
        family_id: profile.family_id,
        owner_profile_id: profileId,
        provider: 'google_calendar',
        display_name: 'Google Calendar',
        status: 'connected',
        encrypted_secret_ref: encryptedRef,
        metadata: { email: 'ashwalgmail@gmail.com' },
        last_error: null,
      }, { onConflict: 'family_id,provider' })
      .select()
      .single()

    if (intError || !integration) {
      throw new Error(intError?.message || 'Failed to save integration')
    }

    // Fetch all calendars from Google and save them
    const { createOAuthClient } = await import('@/lib/google/calendar')
    const oauth = createOAuthClient()
    oauth.setCredentials({ access_token: tokens.access_token || undefined, refresh_token: tokens.refresh_token })
    const { google } = await import('googleapis')
    const cal = google.calendar({ version: 'v3', auth: oauth })
    const calList = await cal.calendarList.list()
    const items = calList.data.items || []

    const familyCal = items.find(c => c.summary === 'משפחת אשואל')
    const primaryCal = items.find(c => c.primary === true)
    const selectedId = familyCal?.id || primaryCal?.id

    for (const item of items) {
      if (!item.id || !item.summary) continue
      await adminSupabase
        .from('external_calendars')
        .upsert({
          family_id: profile.family_id,
          integration_id: integration.id,
          provider_calendar_id: item.id,
          name: item.summary,
          color: item.backgroundColor || '#4285f4',
          selected: item.id === selectedId,
          writable: item.accessRole === 'owner' || item.accessRole === 'writer',
          default_for_new_events: item.id === selectedId,
        }, { onConflict: 'integration_id,provider_calendar_id' })
    }

    const selectedCal = familyCal || primaryCal

    // Log success
    await adminSupabase.from('sync_logs').insert({
      family_id: profile.family_id,
      integration_id: integration.id,
      level: 'info',
      message: 'Google Calendar connected successfully',
      metadata: { calendar: selectedCal?.summary, writable: selectedCal?.accessRole, totalCalendars: items.length },
    })

    const response = NextResponse.redirect(new URL('/settings/integrations?success=google_connected', request.url))
    response.cookies.delete('google_oauth_state')
    response.cookies.delete('google_oauth_profile_id')
    return response
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Google OAuth callback error:', msg)
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(msg)}`, request.url))
  }
}
