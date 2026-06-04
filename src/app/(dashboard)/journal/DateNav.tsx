'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  date: string
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date().toISOString().split('T')[0]
  const yesterday = addDays(today, -1)
  if (dateStr === today) return "Aujourd'hui"
  if (dateStr === yesterday) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function DateNav({ date }: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const isToday = date === today

  const go = (n: number) => {
    const next = addDays(date, n)
    router.push(`/journal?date=${next}`)
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        onClick={() => go(-1)}
        className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-60"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
      >
        <ChevronLeft size={18} color="#0F0F0F" />
      </button>

      <button
        onClick={() => router.push(`/journal?date=${today}`)}
        className="flex flex-col items-center"
      >
        <span className="font-semibold capitalize" style={{ color: '#0F0F0F' }}>
          {formatDisplay(date)}
        </span>
        {!isToday && (
          <span className="text-xs" style={{ color: '#FF6B2B' }}>
            {new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </button>

      <button
        onClick={() => go(1)}
        disabled={isToday}
        className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 active:opacity-60"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
      >
        <ChevronRight size={18} color="#0F0F0F" />
      </button>
    </div>
  )
}
