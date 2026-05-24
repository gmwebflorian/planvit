import { redirect } from 'next/navigation'
import { Settings } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getDayEntries, getDayStravaCalories } from '@/lib/supabase/queries'
import CalorieRing from '@/components/CalorieRing'
import MacroBar from '@/components/MacroBar'
import MealSection from '@/components/MealSection'
import type { MealType } from '@/types'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [profile, entries, stravaCalories] = await Promise.all([
    getProfile(supabase, user.id),
    getDayEntries(supabase, user.id, today),
    getDayStravaCalories(supabase, user.id, today),
  ])

  if (!profile) redirect('/login')

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0)
  const totalProtein = entries.reduce((s, e) => s + e.protein_g, 0)
  const totalCarbs = entries.reduce((s, e) => s + e.carbs_g, 0)
  const totalFat = entries.reduce((s, e) => s + e.fat_g, 0)
  const totalFiber = entries.reduce((s, e) => s + (e.fiber_g ?? 0), 0)

  const initials = profile.full_name
    ? profile.full_name.slice(0, 1).toUpperCase()
    : user.email?.slice(0, 1).toUpperCase() ?? '?'

  const displayName = profile.full_name ?? user.email ?? 'toi'

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
            >
              {initials}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-semibold leading-tight" style={{ color: '#FFFFFF' }}>
              Bonjour, {displayName} 👋
            </span>
            <span className="text-xs capitalize" style={{ color: '#A0A0A0' }}>
              {formatDate(new Date())}
            </span>
          </div>
        </div>
        <Link href="/profile">
          <Settings size={22} color="#A0A0A0" strokeWidth={1.5} />
        </Link>
      </div>

      {/* Calorie ring */}
      <div
        className="rounded-3xl p-6 flex flex-col items-center"
        style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
      >
        <CalorieRing
          consumed={Math.round(totalCalories)}
          goal={profile.goal_calories ?? 2000}
          burned={Math.round(stravaCalories)}
        />
      </div>

      {/* Macro bars */}
      <div
        className="rounded-3xl px-5 py-4 flex flex-col gap-4"
        style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
      >
        <span className="font-semibold" style={{ color: '#FFFFFF' }}>Macronutriments</span>
        <MacroBar
          label="🟠 Protéines"
          current={Math.round(totalProtein)}
          goal={profile.goal_protein_g ?? 170}
          color="#FF6B2B"
        />
        <MacroBar
          label="🔵 Glucides"
          current={Math.round(totalCarbs)}
          goal={profile.goal_carbs_g ?? 190}
          color="#3B82F6"
        />
        <MacroBar
          label="🟡 Lipides"
          current={Math.round(totalFat)}
          goal={profile.goal_fat_g ?? 65}
          color="#EAB308"
        />
        <MacroBar
          label="🟢 Fibres"
          current={Math.round(totalFiber * 10) / 10}
          goal={profile.goal_fiber_g ?? 25}
          color="#10B981"
        />
      </div>

      {/* Meal sections */}
      <div className="flex flex-col gap-3">
        <span className="font-semibold" style={{ color: '#FFFFFF' }}>Repas du jour</span>
        {MEAL_TYPES.map((type) => (
          <MealSection
            key={type}
            type={type}
            entries={entries.filter((e) => e.meal_type === type)}
          />
        ))}
      </div>
    </div>
  )
}
