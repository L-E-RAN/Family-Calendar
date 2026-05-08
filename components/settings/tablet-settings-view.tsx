'use client'

import { useState } from 'react'
import { Tablet, Lock, ExternalLink, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props {
  hasPinSet: boolean
}

export default function TabletSettingsView({ hasPinSet: initialHasPinSet }: Props) {
  const [hasPinSet, setHasPinSet] = useState(initialHasPinSet)
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleSavePin() {
    if (!/^\d{4}$/.test(pin)) {
      toast.error('PIN חייב להיות בדיוק 4 ספרות')
      return
    }
    if (pin !== confirm) {
      toast.error('PIN ואישור PIN לא תואמים')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/tablet/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      if (!res.ok) {
        const body = await res.json()
        toast.error(body.error || 'שגיאה')
      } else {
        toast.success('PIN נשמר בהצלחה')
        setHasPinSet(true)
        setPin('')
        setConfirm('')
        setShowForm(false)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-xl space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Tablet className="w-6 h-6" />
          מצב טאבלט משפחתי
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          הגדר PIN לניהול הטאבלט ופתח את מסך הטאבלט המשפחתי.
        </p>
      </div>

      {/* PIN status */}
      <div className="rounded-xl border bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-900">קוד PIN</h2>
          {hasPinSet && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> מוגדר
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600">
          ה-PIN נדרש לאישור משימות, מחיקה, שינוי הגדרות וכניסה למסכי ניהול מהטאבלט.
        </p>

        {!showForm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            {hasPinSet ? 'שנה PIN' : 'הגדר PIN'}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">PIN (4 ספרות)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-32 border rounded-lg px-3 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">אמת PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirm}
                onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-32 border rounded-lg px-3 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="••••"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSavePin} disabled={saving}>
                {saving ? 'שומר...' : 'שמור PIN'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setPin(''); setConfirm('') }}>
                ביטול
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Link to tablet mode */}
      <div className="rounded-xl border bg-indigo-50 border-indigo-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Tablet className="w-5 h-5 text-indigo-600" />
          <h2 className="font-semibold text-indigo-900">פתח מסך טאבלט</h2>
        </div>
        <p className="text-sm text-indigo-700">
          המסך המשפחתי מציג את כל הילדים, ניקוד וזמן מסך. ניתן לסמן משימות מבלי צורך בכניסה אישית.
        </p>
        <Link
          href="/tablet"
          target="_blank"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          פתח מסך טאבלט
        </Link>
      </div>

      {/* What's locked */}
      <div className="rounded-xl border bg-white p-4 space-y-2">
        <h2 className="font-semibold text-gray-900 text-sm">פעולות הדורשות PIN בטאבלט</h2>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>אישור / דחיית משימות</li>
          <li>כניסה למסכי הגדרות וניהול</li>
          <li>חיבור Google Calendar ומשו״ב</li>
          <li>שינוי ניקוד וזמן מסך</li>
          <li>מחיקת משימות</li>
        </ul>
        <h2 className="font-semibold text-gray-900 text-sm pt-2">פעולות חופשיות בטאבלט</h2>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>צפייה בלוח היום וכל הטורים</li>
          <li>סימון "סיימתי" על משימות</li>
          <li>צפייה בניקוד וזמן מסך</li>
          <li>פתיחת פרטי משימה</li>
        </ul>
      </div>
    </div>
  )
}
