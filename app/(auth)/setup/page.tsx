'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

export default function SetupPage() {
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<'family_admin' | 'parent' | 'child'>('family_admin')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // For first user, create the family first
      const familyRes = await fetch('/api/setup/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'משפחת אשואל' }),
      })

      if (!familyRes.ok) {
        const err = await familyRes.json()
        throw new Error(err.error || 'Failed to create family')
      }

      const { family_id } = await familyRes.json()

      const { error } = await supabase.from('profiles').insert({
        auth_user_id: user.id,
        family_id,
        display_name: displayName.trim(),
        role,
      })

      if (error) throw error

      toast.success('ברוך הבא!')
      router.push('/today')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'שגיאה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-4xl mb-2">👨‍👩‍👧‍👦</div>
          <CardTitle>הגדרת פרופיל</CardTitle>
          <CardDescription>הכנס פרטים לחשבון שלך</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">שמך</Label>
              <Input
                id="name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="ישראל ישראלי"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family_admin">מנהל משפחה</SelectItem>
                  <SelectItem value="parent">הורה</SelectItem>
                  <SelectItem value="child">ילד/ה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !displayName.trim()}>
              {loading ? 'שומר...' : 'התחל'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
