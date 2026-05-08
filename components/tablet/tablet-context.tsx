'use client'

import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'
import type { Profile } from '@/types'

const PIN_TTL_MS = 10 * 60 * 1000 // 10 minutes

interface TabletContextValue {
  profile: Profile
  pinVerified: boolean
  verifyPin: (pin: string) => Promise<boolean>
  clearPin: () => void
  requestPin: (onSuccess: () => void) => void
  pinRequest: { onSuccess: () => void } | null
  dismissPinRequest: () => void
}

const TabletContext = createContext<TabletContextValue | null>(null)

export function useTablet() {
  const ctx = useContext(TabletContext)
  if (!ctx) throw new Error('useTablet must be used inside TabletProvider')
  return ctx
}

export default function TabletProvider({
  profile,
  children,
}: {
  profile: Profile
  children: ReactNode
}) {
  const [pinVerified, setPinVerified] = useState(false)
  const pinExpiryRef = useRef<number>(0)
  const [pinRequest, setPinRequest] = useState<{ onSuccess: () => void } | null>(null)

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const res = await fetch('/api/auth/tablet/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    if (!res.ok) return false
    const body = await res.json()
    if (body.valid) {
      setPinVerified(true)
      pinExpiryRef.current = Date.now() + PIN_TTL_MS
      return true
    }
    return false
  }, [])

  const clearPin = useCallback(() => {
    setPinVerified(false)
    pinExpiryRef.current = 0
  }, [])

  const isPinStillValid = useCallback(() => {
    if (!pinVerified) return false
    if (Date.now() > pinExpiryRef.current) {
      setPinVerified(false)
      return false
    }
    return true
  }, [pinVerified])

  const requestPin = useCallback((onSuccess: () => void) => {
    if (isPinStillValid()) {
      onSuccess()
      return
    }
    setPinRequest({ onSuccess })
  }, [isPinStillValid])

  const dismissPinRequest = useCallback(() => setPinRequest(null), [])

  return (
    <TabletContext.Provider value={{
      profile,
      pinVerified,
      verifyPin,
      clearPin,
      requestPin,
      pinRequest,
      dismissPinRequest,
    }}>
      {children}
    </TabletContext.Provider>
  )
}
