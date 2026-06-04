import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getPeriodEntries, getPeriodStravaCalories, type PeriodEntry } from '@/lib/supabase/queries'
import CalorieChart from './CalorieChart'
import PeriodToggle, { type Period } from './PeriodToggle'

function buildDateRange(days: number): { fromDate: string; toDate: string; dates: string[] } {
  const toDate = new Date().toISOString().split('T')[0]
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  const fromDate = from.toISOString().split('T')[0]

  const dates: string[] = []
  const cur = new Date(fromDate + 'T00:00:00')
  const end = new Date(toDate + 'T00:00:00')
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }

  return { fromDate, toDate, dates }
}

function aggregateByDate(entries: PeriodEntry[]): Record<string, { calories: number; protein: number; carbs: number; fat: number }> {
  const map: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {}
  for (const e of entries) {
    if (!map[e.date]) map[e.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 }
    map[e.date].calories += e.calories
    map[e.date].protein += e.protein_g
    map[e.date].carbs += e.carbs_g
    map[e.date].fat += e.fat_g
  }
  return map
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { period: periodParam } = await searchParams
  const period: Period = periodParam === 'month' ? 'month' : 'week'
  const days = period === 'week' ? 7 : 30

  const { fromDate, toDate, dates } = buildDateRange(days)

  const [profile, entries, stravaMap] = await Promise.all([
    getProfile(supabase, user.id),
    getPeriodEntries(supabase, user.id, fromDate, toDate),
    getPeriodStravaCalories(supabase, user.id, fromDate, toDate),
  ])

  if (!profile) redirect('/login')

  const goalCal = profile.goal_calories ?? 2000
  const byDate = aggregateByDate(entries)

  const dayStats = dates.map((date) => {
    const d = byDate[date] ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const strava = Math.round(stravaMap[date] ?? 0)
    const budget = goalCal + strava
    const calories = Math.round(d.calories)
    return {
      date,
      calories,
      goal: budget,
      protein: Math.round(d.protein),
      carbs: Math.round(d.carbs),
      fat: Math.round(d.fat),
      strava,
      hasData: calories > 0,
      inGoal: calories > 0 && calories <= budget * 1.1,
    }
  })

  const daysWithData = dayStats.filter((d) => d.hasData)
  const daysInGoal = daysWithData.filter((d) => d.inGoal).length
  const regularityPct = daysWithData.length > 0
    ? Math.round((daysInGoal / daysWithData.length) * 100)
    : 0

  const avgCalories = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length)
    : 0

  const totalCalories = daysWithData.reduce((s, d) => s + d.calories, 0)

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-6">
      <h1 className="text-xl font-bold" style={{ color: '#0F0F0F' }}>Historique</h1>

      {/* Period toggle */}
      <Suspense>
        <PeriodToggle current={period} />
      </Suspense>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Régularité"
          value={`${regularityPct}%`}
          sub={`${daysInGoal}/${daysWithData.length} jours`}
          color={regularityPct >= 80 ? '#22C55E' : regularityPct >= 50 ? '#EAB308' : '#EF4444'}
        />
        <StatCard
          label="Moy. / jour"
          value={avgCalories > 0 ? `${avgCalories}` : '—'}
          sub="kcal"
          color="#FF6B2B"
        />
        <StatCard
          label="Total"
          value={totalCalories > 0 ? `${(totalCalories / 1000).toFixed(1)}k` : '—'}
          sub="kcal"
          color="#3B82F6"
        />
      </div>

      {/* Chart */}
      {daysWithData.length > 0 ? (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
        >
          <CalorieChart days={dayStats} />
        </div>
      ) : (
        <div
          className="rounded-2xl p-8 flex flex-col items-center gap-2"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
        >
          <p className="font-medium" style={{ color: '#0F0F0F' }}>Pas encore de données</p>
          <p className="text-sm text-center" style={{ color: '#6B6457' }}>
            Ajoute des repas pour voir ton historique ici.
          </p>
        </div>
      )}

      {/* Daily table */}
      {daysWithData.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
        >
          <div
            className="grid grid-cols-4 px-4 py-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: '#6B6457', borderBottom: '1px solid #DDD7CC' }}
          >
            <span>Jour</span>
            <span className="text-right">Kcal</span>
            <span className="text-right">Prot.</span>
            <span className="text-right">Statut</span>
          </div>
          {[...dayStats].reverse().map((d) => (
            <div
              key={d.date}
              className="grid grid-cols-4 px-4 py-3 items-center"
              style={{ borderBottom: '1px solid #DDD7CC', opacity: d.hasData ? 1 : 0.4 }}
            >
              <span className="text-sm" style={{ color: '#0F0F0F' }}>
                {new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </span>
              <span className="text-sm tabular-nums text-right" style={{ color: '#0F0F0F' }}>
                {d.hasData ? d.calories.toLocaleString('fr-FR') : '—'}
              </span>
              <span className="text-sm tabular-nums text-right" style={{ color: '#6B6457' }}>
                {d.hasData ? `${d.protein}g` : '—'}
              </span>
              <div className="flex justify-end">
                {d.hasData ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: d.inGoal ? '#22C55E20' : '#EF444420',
                      color: d.inGoal ? '#22C55E' : '#EF4444',
                    }}
                  >
                    {d.inGoal ? '✓' : `+${d.calories - d.goal}`}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: '#6B6457' }}>—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
    >
      <span className="text-xs" style={{ color: '#6B6457' }}>{label}</span>
      <span className="text-xl font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-xs" style={{ color: '#6B6457' }}>{sub}</span>
    </div>
  )
}
