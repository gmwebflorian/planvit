import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getDayEntries, getDayStravaCalories } from '@/lib/supabase/queries'
import MealSection from '@/components/MealSection'
import DateNav from './DateNav'
import type { MealType } from '@/types'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { date: dateParam } = await searchParams
  const today = new Date().toISOString().split('T')[0]
  const date = dateParam ?? today

  const [profile, entries, stravaCalories] = await Promise.all([
    getProfile(supabase, user.id),
    getDayEntries(supabase, user.id, date),
    getDayStravaCalories(supabase, user.id, date),
  ])

  if (!profile) redirect('/login')

  const totalCal = Math.round(entries.reduce((s, e) => s + e.calories, 0))
  const totalProt = Math.round(entries.reduce((s, e) => s + e.protein_g, 0))
  const totalCarbs = Math.round(entries.reduce((s, e) => s + e.carbs_g, 0))
  const totalFat = Math.round(entries.reduce((s, e) => s + e.fat_g, 0))

  const goalCal = profile.goal_calories ?? 2000
  const budget = goalCal + Math.round(stravaCalories)
  const remaining = budget - totalCal
  const isOver = remaining < 0

  return (
    <div className="flex flex-col gap-4 pt-3">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-1">
        <h1 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>Journal</h1>
        <Link
          href="/history"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
          style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E', color: '#A0A0A0' }}
        >
          <BarChart2 size={14} />
          Historique
        </Link>
      </div>

      {/* Date navigation */}
      <DateNav date={date} />

      {/* Daily summary card */}
      <div className="px-4">
        <div
          className="rounded-3xl p-5 flex flex-col gap-4"
          style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
        >
          {/* Calorie summary */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold tabular-nums" style={{ color: '#FFFFFF' }}>
                {totalCal.toLocaleString('fr-FR')}
                <span className="text-base font-normal ml-1" style={{ color: '#A0A0A0' }}>kcal</span>
              </p>
              <p className="text-sm mt-0.5" style={{ color: '#A0A0A0' }}>
                sur {budget.toLocaleString('fr-FR')} kcal
                {stravaCalories > 0 && (
                  <span style={{ color: '#22C55E' }}> (+{Math.round(stravaCalories)} Strava)</span>
                )}
              </p>
            </div>
            <div
              className="px-3 py-1.5 rounded-full text-sm font-semibold tabular-nums"
              style={{
                backgroundColor: isOver ? '#EF444420' : '#22C55E20',
                color: isOver ? '#EF4444' : '#22C55E',
              }}
            >
              {isOver ? '+' : ''}{Math.abs(remaining).toLocaleString('fr-FR')} kcal {isOver ? 'de trop' : 'restantes'}
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full" style={{ backgroundColor: '#242424' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (totalCal / budget) * 100)}%`,
                backgroundColor: isOver ? '#EF4444' : '#FF6B2B',
              }}
            />
          </div>

          {/* Macro row */}
          <div className="grid grid-cols-3 gap-2">
            <MacroChip label="Protéines" value={totalProt} goal={profile.goal_protein_g ?? 170} color="#FF6B2B" />
            <MacroChip label="Glucides" value={totalCarbs} goal={profile.goal_carbs_g ?? 190} color="#3B82F6" />
            <MacroChip label="Lipides" value={totalFat} goal={profile.goal_fat_g ?? 65} color="#EAB308" />
          </div>
        </div>
      </div>

      {/* Meals */}
      <div className="px-4 flex flex-col gap-3 pb-4">
        {MEAL_TYPES.map((type) => (
          <MealSection
            key={type}
            type={type}
            entries={entries.filter((e) => e.meal_type === type)}
          />
        ))}

        {entries.length === 0 && (
          <div className="flex flex-col items-center py-10 gap-2">
            <p className="text-base font-medium" style={{ color: '#FFFFFF' }}>Aucun repas ce jour</p>
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Utilise le bouton + pour ajouter un aliment.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function MacroChip({
  label,
  value,
  goal,
  color,
}: {
  label: string
  value: number
  goal: number
  color: string
}) {
  const pct = Math.min(100, Math.round((value / goal) * 100))
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{ backgroundColor: '#242424' }}
    >
      <span className="text-[10px] uppercase tracking-wide font-medium" style={{ color: '#A0A0A0' }}>{label}</span>
      <span className="text-base font-bold tabular-nums" style={{ color }}>{value}g</span>
      <span className="text-[10px] tabular-nums" style={{ color: '#A0A0A0' }}>{pct}% / {goal}g</span>
    </div>
  )
}
