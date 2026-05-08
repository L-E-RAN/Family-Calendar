'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Trash2, Plus, Monitor } from 'lucide-react'
import type { ScreenTimeRewardTier } from '@/types'

interface Props {
  initialTiers: ScreenTimeRewardTier[]
}

interface NewTierForm {
  min_points: string
  screen_time_minutes: string
  label: string
}

const emptyForm = (): NewTierForm => ({ min_points: '', screen_time_minutes: '', label: '' })

export default function ScreenTimeTiersView({ initialTiers }: Props) {
  const [tiers, setTiers] = useState<ScreenTimeRewardTier[]>(
    [...initialTiers].sort((a, b) => a.min_points - b.min_points)
  )
  const [form, setForm] = useState<NewTierForm>(emptyForm())
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function addTier() {
    const min = Number(form.min_points)
    const mins = Number(form.screen_time_minutes)
    if (!form.min_points || !form.screen_time_minutes || isNaN(min) || isNaN(mins)) {
      toast.error('מלא נקודות מינימום וזמן מסך')
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/settings/screen-time-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ min_points: min, screen_time_minutes: mins, label: form.label || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { tier } = await res.json()
      setTiers(prev => [...prev, tier].sort((a, b) => a.min_points - b.min_points))
      setForm(emptyForm())
      toast.success('מדרגה נוספה')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setAdding(false)
    }
  }

  async function deleteTier(tier: ScreenTimeRewardTier) {
    setLoading(prev => ({ ...prev, [`del-${tier.id}`]: true }))
    try {
      const res = await fetch(`/api/settings/screen-time-tiers/${tier.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setTiers(prev => prev.filter(t => t.id !== tier.id))
      toast.success('מדרגה נמחקה')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setLoading(prev => ({ ...prev, [`del-${tier.id}`]: false }))
    }
  }

  async function toggleActive(tier: ScreenTimeRewardTier) {
    const res = await fetch(`/api/settings/screen-time-tiers/${tier.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !tier.active }),
    })
    if (!res.ok) { toast.error('שגיאה'); return }
    const { tier: updated } = await res.json()
    setTiers(prev => prev.map(t => t.id === tier.id ? updated : t))
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        הגדר מדרגות זמן מסך למשפחה — כמה נקודות נדרשות לכל מכסת זמן מסך יומית. חל על כל הילדים.
      </p>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            מדרגות זמן מסך
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tiers.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין מדרגות. הוסף למטה.</p>
          ) : (
            <div className="space-y-2">
              {tiers.map(tier => (
                <div
                  key={tier.id}
                  className={`flex items-center gap-3 p-2 rounded-lg border ${tier.active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                >
                  <div className="flex-1 flex items-center gap-3 text-sm">
                    <span className="font-medium w-20 shrink-0">≥ {tier.min_points} נק׳</span>
                    <span className="text-blue-600 font-medium">{tier.screen_time_minutes} דק׳</span>
                    {tier.label && <Badge variant="outline" className="text-xs">{tier.label}</Badge>}
                  </div>
                  <button
                    onClick={() => toggleActive(tier)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      tier.active
                        ? 'border-green-300 text-green-700 bg-green-50'
                        : 'border-gray-300 text-gray-500 bg-gray-50'
                    }`}
                  >
                    {tier.active ? 'פעיל' : 'מושבת'}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteTier(tier)}
                    disabled={loading[`del-${tier.id}`]}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">הוסף מדרגה</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">נקודות מינימום</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.min_points}
                  onChange={e => setForm(prev => ({ ...prev, min_points: e.target.value }))}
                  dir="ltr"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">זמן מסך (דק׳)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="30"
                  value={form.screen_time_minutes}
                  onChange={e => setForm(prev => ({ ...prev, screen_time_minutes: e.target.value }))}
                  dir="ltr"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">תווית (אופציונלי)</Label>
                <Input
                  placeholder="טוב"
                  value={form.label}
                  onChange={e => setForm(prev => ({ ...prev, label: e.target.value }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={addTier}
              disabled={adding}
            >
              <Plus className="w-3.5 h-3.5" />
              {adding ? 'מוסיף...' : 'הוסף מדרגה'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
