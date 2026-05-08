'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { CheckCircle2, AlertCircle, RefreshCw, Unplug, Plug, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import type { Integration, ExternalCalendar, SyncLog, Profile } from '@/types'
import { toast } from 'sonner'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  profile: Profile
  integrations: Integration[]
  calendars: ExternalCalendar[]
  recentLogs: SyncLog[]
}

export default function IntegrationsView({ profile, integrations, calendars, recentLogs }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isAdmin = profile.role === 'family_admin'

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    if (success === 'google_connected') toast.success('Google Calendar חובר בהצלחה!')
    if (error === 'google_denied') toast.error('חיבור Google בוטל')
    if (error === 'no_refresh_token') toast.error('לא התקבל token — נסה שוב עם prompt=consent')
    if (error) toast.error(`שגיאת חיבור Google: ${error}`)
  }, [searchParams])

  const googleIntegration = integrations.find(i => i.provider === 'google_calendar')
  const mashovIntegration = integrations.find(i => i.provider === 'mashov')
  const googleCalendars = calendars.filter(c => googleIntegration && c.integration_id === googleIntegration.id)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">חיבורים</h1>

      {/* Google Calendar */}
      <GoogleSection
        integration={googleIntegration || null}
        calendars={googleCalendars}
        isAdmin={isAdmin}
        onRefresh={() => router.refresh()}
      />

      {/* Mashov */}
      <MashovSection
        integration={mashovIntegration || null}
        isAdmin={isAdmin}
        onRefresh={() => router.refresh()}
      />

      {/* WhatsApp placeholder */}
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span>💬</span>
            WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">לא מוגדר — שלב 2</Badge>
          <p className="text-xs text-muted-foreground mt-2">
            התראות WhatsApp יתווספו בגרסה הבאה
          </p>
        </CardContent>
      </Card>

      {/* Sync logs */}
      {recentLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              יומן סנכרון אחרון
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLogs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-start gap-2 text-xs">
                <span className={log.level === 'error' ? 'text-red-500' : log.level === 'warning' ? 'text-yellow-600' : 'text-green-600'}>
                  {log.level === 'error' ? '✗' : log.level === 'warning' ? '⚠' : '✓'}
                </span>
                <div className="flex-1">
                  <p>{log.message}</p>
                  <p className="text-muted-foreground">
                    {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: he })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function GoogleSection({
  integration, calendars, isAdmin, onRefresh
}: {
  integration: Integration | null
  calendars: ExternalCalendar[]
  isAdmin: boolean
  onRefresh: () => void
}) {
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const connected = integration?.status === 'connected'

  async function connectGoogle() {
    setConnecting(true)
    try {
      const res = await fetch('/api/integrations/google/connect', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      const { url } = await res.json()
      window.location.href = url
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה')
      setConnecting(false)
    }
  }

  async function syncNow() {
    setSyncing(true)
    try {
      const res = await fetch('/api/integrations/google/sync-now', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`סנכרן ${data.synced} אירועים`)
      onRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאת סנכרון')
    } finally {
      setSyncing(false)
    }
  }

  async function disconnect() {
    if (!confirm('לנתק את Google Calendar?')) return
    const res = await fetch('/api/integrations/google/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deleteItems: false }) })
    if (res.ok) { toast.success('נותק'); onRefresh() }
    else toast.error('שגיאה בניתוק')
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span>📅</span>
          Google Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {connected ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : integration?.status === 'error' || integration?.status === 'needs_reauth' ? (
            <AlertCircle className="w-4 h-4 text-red-500" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
          )}
          <span className="text-sm">
            {connected ? 'מחובר — ashwalgmail@gmail.com' : 'לא מחובר'}
          </span>
          {integration?.status === 'needs_reauth' && (
            <Badge variant="destructive" className="text-xs">נדרש חיבור מחדש</Badge>
          )}
        </div>

        {calendars.length > 0 && (
          <div className="space-y-1">
            {calendars.map(cal => (
              <div key={cal.id} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color || '#4285f4' }} />
                <span>{cal.name}</span>
                {cal.writable && <Badge variant="outline" className="text-xs">ניתן לכתיבה</Badge>}
                {cal.default_for_new_events && <Badge variant="secondary" className="text-xs">ברירת מחדל</Badge>}
              </div>
            ))}
          </div>
        )}

        {integration?.last_sync_at && (
          <p className="text-xs text-muted-foreground">
            סנכרון אחרון: {format(new Date(integration.last_sync_at), 'dd/MM/yyyy HH:mm', { locale: he })}
          </p>
        )}

        {integration?.last_error && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded">
            שגיאה: {integration.last_error}
          </p>
        )}

        {isAdmin && (
          <div className="flex flex-wrap gap-2 pt-1">
            {!connected ? (
              <Button size="sm" onClick={connectGoogle} disabled={connecting}>
                <Plug className="w-4 h-4 ml-1" />
                {connecting ? 'מתחבר...' : 'חבר Google Calendar'}
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing}>
                  <RefreshCw className={`w-4 h-4 ml-1 ${syncing ? 'animate-spin' : ''}`} />
                  סנכרן עכשיו
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={disconnect}>
                  <Unplug className="w-4 h-4 ml-1" />
                  נתק
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MashovSection({
  integration, isAdmin, onRefresh
}: {
  integration: Integration | null
  isAdmin: boolean
  onRefresh: () => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', schoolCode: '' })
  const connected = integration?.status === 'connected'
  const students = (integration?.metadata as Record<string, unknown>)?.students as Array<{ name: string }> | undefined

  async function connect() {
    try {
      const res = await fetch('/api/integrations/mashov/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('משוב חובר!')
      setShowForm(false)
      onRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאת חיבור')
    }
  }

  async function syncNow() {
    setSyncing(true)
    try {
      const res = await fetch('/api/integrations/mashov/sync-now', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('סנכרון הושלם')
      onRefresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאת סנכרון')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span>🏫</span>
          משוב
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          {connected ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
          )}
          <span className="text-sm">
            {connected ? 'מחובר' : 'לא מחובר'}
          </span>
        </div>

        {students && students.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">תלמידים:</p>
            {students.map((s, i) => (
              <Badge key={i} variant="outline" className="text-xs ml-1">{s.name}</Badge>
            ))}
          </div>
        )}

        {integration?.last_sync_at && (
          <p className="text-xs text-muted-foreground">
            סנכרון אחרון: {format(new Date(integration.last_sync_at), 'dd/MM/yyyy HH:mm', { locale: he })}
          </p>
        )}

        {integration?.last_error && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{integration.last_error}</p>
        )}

        {isAdmin && (
          <div className="space-y-3">
            {!connected ? (
              <>
                {!showForm ? (
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <Plug className="w-4 h-4 ml-1" />
                    חבר משוב
                  </Button>
                ) : (
                  <div className="space-y-2 border rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground">פרטי כניסה למשוב</p>
                    <Input
                      placeholder='שם משתמש / ת"ז'
                      value={form.username}
                      onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      dir="ltr"
                    />
                    <Input
                      type="password"
                      placeholder="סיסמה"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      dir="ltr"
                    />
                    <Input
                      placeholder="קוד בית ספר (סמל)"
                      value={form.schoolCode}
                      onChange={e => setForm(f => ({ ...f, schoolCode: e.target.value }))}
                      dir="ltr"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={connect}>התחבר</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>ביטול</Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing}>
                <RefreshCw className={`w-4 h-4 ml-1 ${syncing ? 'animate-spin' : ''}`} />
                סנכרן עכשיו
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
