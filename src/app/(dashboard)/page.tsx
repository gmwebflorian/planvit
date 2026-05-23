import { Settings } from 'lucide-react'
import Link from 'next/link'
import CalorieRing from '@/components/CalorieRing'
import MacroBar from '@/components/MacroBar'
import MealSection from '@/components/MealSection'
import type { FoodEntry, MealType } from '@/types'

// Mock data — à remplacer par les vraies données Supabase
const MOCK_PROFILE = {
  full_name: 'Florian',
  avatar_url: null,
  goal_calories: 2000,
  goal_protein_g: 170,
  goal_carbs_g: 190,
  goal_fat_g: 65,
}

const MOCK_ENTRIES: FoodEntry[] = [
  {
    id: '1',
    user_id: 'u1',
    date: new Date().toISOString().split('T')[0],
    meal_type: 'breakfast',
    food_name: 'Wrap œufs-poulet-skyr',
    quantity_g: 1,
    calories: 508,
    protein_g: 37,
    carbs_g: 38,
    fat_g: 23,
    fiber_g: null,
    custom_food_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'u1',
    date: new Date().toISOString().split('T')[0],
    meal_type: 'lunch',
    food_name: 'Poulet grillé',
    quantity_g: 200,
    calories: 330,
    protein_g: 62,
    carbs_g: 0,
    fat_g: 8,
    fiber_g: null,
    custom_food_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const MOCK_STRAVA_CALORIES = 350

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export default function DashboardPage() {
  const today = new Date()
  const profile = MOCK_PROFILE
  const entries = MOCK_ENTRIES
  const stravaCalories = MOCK_STRAVA_CALORIES

  const totalCalories = entries.reduce((s, e) => s + e.calories, 0)
  const totalProtein = entries.reduce((s, e) => s + e.protein_g, 0)
  const totalCarbs = entries.reduce((s, e) => s + e.carbs_g, 0)
  const totalFat = entries.reduce((s, e) => s + e.fat_g, 0)

  const initials = profile.full_name
    ? profile.full_name.slice(0, 1).toUpperCase()
    : '?'

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
          >
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold leading-tight" style={{ color: '#FFFFFF' }}>
              Bonjour, {profile.full_name} 👋
            </span>
            <span className="text-xs capitalize" style={{ color: '#A0A0A0' }}>
              {formatDate(today)}
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
          consumed={totalCalories}
          goal={profile.goal_calories ?? 2000}
          burned={stravaCalories}
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
          current={totalProtein}
          goal={profile.goal_protein_g ?? 170}
          color="#FF6B2B"
        />
        <MacroBar
          label="🔵 Glucides"
          current={totalCarbs}
          goal={profile.goal_carbs_g ?? 190}
          color="#3B82F6"
        />
        <MacroBar
          label="🟡 Lipides"
          current={totalFat}
          goal={profile.goal_fat_g ?? 65}
          color="#EAB308"
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
