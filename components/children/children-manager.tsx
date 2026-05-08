'use client'

import { useState } from 'react'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Child } from '@/types'
import { toast } from 'sonner'

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#ec4899', '#f97316', '#8b5cf6', '#14b8a6', '#84cc16',
]

interface Props {
  initialChildren: Child[]
  canEdit: boolean
}

export default function ChildrenManager({ initialChildren, canEdit }: Props) {
  const [children, setChildren] = useState(initialChildren)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', color: COLORS[0], mashov_student_id: '', school_name: '', active: true })
  const [saving, setSaving] = useState(false)

  async function saveNew() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          color: form.color,
          mashov_student_id: form.mashov_student_id || null,
          school_name: form.school_name || null,
          active: form.active,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { child } = await res.json()
      setChildren(prev => [...prev, child])
      setShowAdd(false)
      setForm({ name: '', color: COLORS[0], mashov_student_id: '', school_name: '', active: true })
      toast.success('ילד נוסף')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setSaving(false)
    }
  }

  async function saveEdit(child: Child) {
    setSaving(true)
    try {
      const res = await fetch(`/api/children/${child.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: child.name,
          color: child.color,
          mashov_student_id: child.mashov_student_id || null,
          school_name: child.school_name || null,
          active: child.active,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { child: updated } = await res.json()
      setChildren(prev => prev.map(c => c.id === updated.id ? updated : c))
      setEditingId(null)
      toast.success('שמור')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setSaving(false)
    }
  }

  function updateChild(id: string, updates: Partial<Child>) {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ילדים</h1>
        {canEdit && (
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 ml-1" />
            הוסף ילד
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-medium text-sm">ילד חדש</p>
            <Input
              placeholder="שם"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="בית ספר"
              value={form.school_name}
              onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
            />
            <Input
              placeholder="מזהה תלמיד במשוב (אופציונלי)"
              value={form.mashov_student_id}
              onChange={e => setForm(f => ({ ...f, mashov_student_id: e.target.value }))}
              dir="ltr"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">צבע</p>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active-new"
                checked={form.active}
                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              />
              <label htmlFor="active-new" className="text-sm">פעיל</label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveNew} disabled={saving || !form.name.trim()}>
                {saving ? 'שומר...' : 'שמור'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>ביטול</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Children list */}
      <div className="space-y-3">
        {children.map(child => (
          <Card key={child.id} className={!child.active ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              {editingId === child.id ? (
                <div className="space-y-3">
                  <Input
                    value={child.name}
                    onChange={e => updateChild(child.id, { name: e.target.value })}
                    placeholder="שם"
                  />
                  <Input
                    value={child.school_name || ''}
                    onChange={e => updateChild(child.id, { school_name: e.target.value })}
                    placeholder="בית ספר"
                  />
                  <Input
                    value={child.mashov_student_id || ''}
                    onChange={e => updateChild(child.id, { mashov_student_id: e.target.value })}
                    placeholder="מזהה במשוב"
                    dir="ltr"
                  />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">צבע</p>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${child.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                          onClick={() => updateChild(child.id, { color: c })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={child.active}
                      onChange={e => updateChild(child.id, { active: e.target.checked })}
                    />
                    <span className="text-sm">פעיל</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(child)} disabled={saving}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: child.color }}>
                    {child.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{child.name}</p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {child.school_name && (
                        <span className="text-xs text-muted-foreground">{child.school_name}</span>
                      )}
                      {!child.active && (
                        <Badge variant="secondary" className="text-xs">לא פעיל</Badge>
                      )}
                      {child.mashov_student_id && (
                        <Badge variant="outline" className="text-xs">משוב: {child.mashov_student_id}</Badge>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(child.id)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {children.length === 0 && !showAdd && (
        <div className="text-center py-12 text-muted-foreground">
          <p>אין ילדים עדיין</p>
          {canEdit && <p className="text-sm mt-1">לחץ "הוסף ילד" להתחלה</p>}
        </div>
      )}
    </div>
  )
}
