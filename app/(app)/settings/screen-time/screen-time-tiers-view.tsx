'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Trash2, Plus, Monitor } from 'lucide-react'
import type { Child, ScreenTimeRewardTier } from '@/types'

interface Props {
  children: Child[]
  initialTiers: ScreenTimeRewardTier[]
}

interface NewTierForm {
  min_points: string
  screen_time_minutes: string
  label: string
}

const emptyForm = (): NewTierForm => ({ min_points: '', screen_time_minutes: '', label: '' })

export default function ScreenTimeTiersView({ children, initialTiers }: Props) {
  const [tiers, setTiers] = useState<ScreenTimeRewardTier[]>(initialTiers)
  const [forms, setForms] = useState<Record<string, NewTierForm>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  function getChildTiers(childId: string) {
    return tiers.filter(t => t.child_id === childId).sort((a, b) => a.min_points - b.min_points)
  }

  function setChildForm(childId: string, patch: Partial<NewTierForm>) {
    setForms(prev => ({ ...prev, [childId]: { ...(prev[childId] ?? emptyForm()), ...patch } }))
  }

  async function addTier(child: Child) {
    const form = forms[child.id] ?? emptyForm()
    const min = Number(form.min_points)
    const mins = Number(form.screen_time_minutes)
    if (!form.min_points || !form.screen_time_minutes || isNaN(min) || isNaN(mins)) {
      toast.error('מלא נקודות מינימום וזמן מסך')
      return
    }
    setLoading(prev => ({ ...prev, [`add-${child.id}`]: true }))
    try {
      const res = await fetch('/api/settings/screen-time-tiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: child.id, min_points: min, screen_time_minutes: mins, label: form.label || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { tier } = await res.json()
      setTiers(prev => [...prev, tier])
      setForms(prev => ({ ...prev, [child.id]: emptyForm() }))
      toast.success('מדרגה נוספה')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setLoading(prev => ({ ...prev, [`add-${child.id}`]: false }))
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

  if (children.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Monitor className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p>אין ילדים פעילים במשפחה</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        הגדר מדרגות זמן מסך לכל ילד — כמה נקודות נדרשות לכל מכסת זמן מסך יומית.
      </p>

      {children.map(child => {
        const childTiers = getChildTiers(child.id)
        const form = forms[child.id] ?? emptyForm()
        const adding = loading[`add-${child.id}`]

        return (
          <Card key={child.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: child.color }}
                >
                  {child.name.charAt(0)}
                </div>
                {child.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Existing tiers */}
              {childTiers.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין מדרגות. הוסף למטה.</p>
              ) : (
                <div className="space-y-2">
                  {childTiers.map(tier => (
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

              {/* Add new tier */}
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
                      onChange={e => setChildForm(child.id, { min_points: e.target.value })}
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
                      onChange={e => setChildForm(child.id, { screen_time_minutes: e.target.value })}
                      dir="ltr"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">תווית (אופציונלי)</Label>
                    <Input
                      placeholder="טוב"
                      value={form.label}
                      onChange={e => setChildForm(child.id, { label: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => addTier(child)}
                  disabled={adding}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {adding ? 'מוסיף...' : 'הוסף מדרגה'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
