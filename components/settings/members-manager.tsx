'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, Crown, User, Baby, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Profile, UserRole } from '@/types'

type Member = Profile & { is_self: boolean }

const ROLE_LABELS: Record<UserRole, string> = {
  family_admin: 'מנהל',
  parent: 'הורה',
  child: 'ילד/ה',
}

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  family_admin: Crown,
  parent: User,
  child: Baby,
}

const ROLE_COLORS: Record<UserRole, string> = {
  family_admin: 'bg-yellow-100 text-yellow-800',
  parent: 'bg-blue-100 text-blue-800',
  child: 'bg-green-100 text-green-800',
}

export default function MembersManager({
  initialMembers,
  isAdmin,
}: {
  initialMembers: Member[]
  isAdmin: boolean
}) {
  const [members, setMembers] = useState<Member[]>(initialMembers)

  // Add member dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ display_name: '', password: '', role: 'parent' as 'parent' | 'child' })
  const [addSaving, setAddSaving] = useState(false)

  // Change password dialog
  const [pwTarget, setPwTarget] = useState<Member | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)

  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddSaving(true)
    try {
      const res = await fetch('/api/settings/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers(prev => [...prev, data.member])
      setAddForm({ display_name: '', password: '', role: 'parent' })
      setAddOpen(false)
      toast.success(`${data.member.display_name} נוסף/ה`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בהוספה')
    } finally {
      setAddSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwTarget) return
    setPwSaving(true)
    try {
      const res = await fetch(`/api/settings/members/${pwTarget.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPwTarget(null)
      setNewPassword('')
      toast.success('סיסמה עודכנה')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בעדכון סיסמה')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleDelete(member: Member) {
    if (!confirm(`למחוק את ${member.display_name}? פעולה זו בלתי הפיכה.`)) return
    setDeleting(member.id)
    try {
      const res = await fetch(`/api/settings/members/${member.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers(prev => prev.filter(m => m.id !== member.id))
      toast.success(`${member.display_name} הוסר/ה`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה במחיקה')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">חברי המשפחה</h2>
          <p className="text-sm text-muted-foreground">כל אחד בוחר שם ומזין סיסמה בכניסה</p>
        </div>
        {isAdmin && (
          <>
            <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
              <UserPlus className="w-4 h-4" />
              הוסף חבר
            </Button>

            {/* Add member dialog */}
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogContent dir="rtl" className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>הוסף חבר משפחה</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>שם תצוגה</Label>
                    <Input
                      value={addForm.display_name}
                      onChange={e => setAddForm(f => ({ ...f, display_name: e.target.value }))}
                      placeholder="ישראל ישראלי"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>סיסמה</Label>
                    <Input
                      type="text"
                      dir="ltr"
                      value={addForm.password}
                      onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="לפחות 6 תווים"
                      minLength={6}
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תפקיד</Label>
                    <Select
                      value={addForm.role}
                      onValueChange={v => setAddForm(f => ({ ...f, role: v as 'parent' | 'child' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">הורה</SelectItem>
                        <SelectItem value="child">ילד/ה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={addSaving}>
                    {addSaving ? 'יוצר...' : 'הוסף'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Change password dialog */}
      <Dialog open={!!pwTarget} onOpenChange={open => { if (!open) { setPwTarget(null); setNewPassword('') } }}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>שינוי סיסמה — {pwTarget?.display_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>סיסמה חדשה</Label>
              <Input
                type="text"
                dir="ltr"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={pwSaving}>
              {pwSaving ? 'שומר...' : 'עדכן סיסמה'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {members.map(member => {
          const Icon = ROLE_ICONS[member.role]
          const canChangePassword = isAdmin || member.is_self
          return (
            <Card key={member.id}>
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {member.display_name}
                    </span>
                    {member.is_self && (
                      <span className="text-xs text-muted-foreground">(את/ה)</span>
                    )}
                    <Badge className={`text-xs ${ROLE_COLORS[member.role]}`} variant="secondary">
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {canChangePassword && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => { setPwTarget(member); setNewPassword('') }}
                      title="שנה סיסמה"
                    >
                      <KeyRound className="w-4 h-4" />
                    </Button>
                  )}
                  {isAdmin && !member.is_self && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(member)}
                      disabled={deleting === member.id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
