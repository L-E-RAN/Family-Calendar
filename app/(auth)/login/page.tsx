'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message === 'Invalid login credentials' ? 'פרטי התחברות שגויים' : error.message)
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
          <CardDescription>התחבר/י כדי לצפות בלוח השנה המשפחתי</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">דוא"ל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoComplete="email"
                dir="ltr"
              />
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'מתחבר...' : 'כניסה'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
