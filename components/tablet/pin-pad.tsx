'use client'

import { useState, useEffect } from 'react'
import { Delete, X } from 'lucide-react'
import { useTablet } from './tablet-context'
import { toast } from 'sonner'

export default function PinPad() {
  const { pinRequest, dismissPinRequest, verifyPin } = useTablet()
  const [digits, setDigits] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  // Reset when dialog opens
  useEffect(() => {
    if (pinRequest) {
      setDigits('')
      setError(false)
    }
  }, [pinRequest])

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (digits.length === 4 && !loading) {
      submit(digits)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits])

  async function submit(pin: string) {
    setLoading(true)
    const ok = await verifyPin(pin)
    setLoading(false)
    if (ok) {
      pinRequest?.onSuccess()
      dismissPinRequest()
      toast.success('PIN אושר')
    } else {
      setError(true)
      setDigits('')
      setTimeout(() => setError(false), 1200)
    }
  }

  function press(d: string) {
    if (digits.length < 4 && !loading) setDigits(p => p + d)
  }

  function del() {
    setDigits(p => p.slice(0, -1))
  }

  if (!pinRequest) return null

  const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl p-6 w-72 space-y-5 transition-all ${error ? 'animate-shake border-2 border-red-400' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">הזן PIN</h2>
          <button onClick={dismissPinRequest} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-4">
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-colors ${
                i < digits.length
                  ? error ? 'bg-red-400 border-red-400' : 'bg-indigo-600 border-indigo-600'
                  : 'border-gray-300'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-center text-sm text-red-500">PIN שגוי</p>}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((k, i) => {
            if (k === '') return <div key={i} />
            if (k === '⌫') return (
              <button
                key={i}
                onClick={del}
                disabled={loading}
                className="h-14 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <Delete className="w-5 h-5" />
              </button>
            )
            return (
              <button
                key={i}
                onClick={() => press(k)}
                disabled={loading}
                className="h-14 rounded-xl bg-gray-100 hover:bg-indigo-50 active:bg-indigo-100 text-xl font-semibold text-gray-800 transition-colors"
              >
                {k}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
