'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type MemberOption = { display_name: string; email: string }

export default function LoginPage() {
  const [members, setMembers] = useState<MemberOption[]>([])
  const [selectedEmail, setSelectedEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetch('/api/auth/members')
      .then(r => r.json())
      .then(d => setMembers(d.members ?? []))
      .catch(() => {/* first user — no members yet */})
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEmail) { toast.error('בחר/י שם'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: selectedEmail, password })
      if (error) {
        toast.error('סיסמה שגויה')
      } else {
        router.push('/today')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="text-4xl">📅</div>
          <CardTitle className="text-2xl">שלום, משפחת אשואל</CardTitle>
          <CardDescription>בחר/י שם והכנס/י סיסמה</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label>שם</Label>
              <Select value={selectedEmail} onValueChange={v => setSelectedEmail(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר/י שם..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.email} value={m.email}>
                      {m.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                dir="ltr"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !selectedEmail}>
              {loading ? 'מתחבר...' : 'כניסה'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
