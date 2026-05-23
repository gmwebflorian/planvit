'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export type Period = 'week' | 'month'

export default function PeriodToggle({ current }: { current: Period }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const go = (p: Period) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', p)
    router.push(`/history?${params.toString()}`)
  }

  return (
    <div
      className="flex p-1 rounded-xl"
      style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
    >
      {(['week', 'month'] as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => go(p)}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{
            backgroundColor: current === p ? '#FF6B2B' : 'transparent',
            color: current === p ? '#FFFFFF' : '#A0A0A0',
          }}
        >
          {p === 'week' ? '7 jours' : '30 jours'}
        </button>
      ))}
    </div>
  )
}
