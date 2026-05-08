'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, Crown, User, Baby } from 'lucide-react'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Profile, UserRole } from '@/types'

type Member = Profile & { email: string; is_self: boolean }

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
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    display_name: '',
    email: '',
    password: '',
    role: 'parent' as 'parent' | 'child',
  })
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers(prev => [...prev, data.member])
      setForm({ display_name: '', email: '', password: '', role: 'parent' })
      setOpen(false)
      toast.success(`${data.member.display_name} נוסף/ה בהצלחה`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בהוספת משתמש')
    } finally {
      setSaving(false)
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
          <p className="text-sm text-muted-foreground">כל אחד מתחבר עם המייל והסיסמה שלו</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <UserPlus className="w-4 h-4" />
                הוסף חבר
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-sm">
              <DialogHeader>
                <DialogTitle>הוסף חבר משפחה</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>שם תצוגה</Label>
                  <Input
                    value={form.display_name}
                    onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                    placeholder="ישראל ישראלי"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>דוא"ל</Label>
                  <Input
                    type="email"
                    dir="ltr"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>סיסמה זמנית</Label>
                  <Input
                    type="text"
                    dir="ltr"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="לפחות 6 תווים"
                    minLength={6}
                    required
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <Label>תפקיד</Label>
                  <Select
                    value={form.role}
                    onValueChange={v => setForm(f => ({ ...f, role: v as 'parent' | 'child' }))}
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
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? 'יוצר...' : 'הוסף'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        {members.map(member => {
          const Icon = ROLE_ICONS[member.role]
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
                  {member.email && (
                    <p className="text-xs text-muted-foreground truncate" dir="ltr">
                      {member.email}
                    </p>
                  )}
                </div>
                {isAdmin && !member.is_self && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    onClick={() => handleDelete(member)}
                    disabled={deleting === member.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
