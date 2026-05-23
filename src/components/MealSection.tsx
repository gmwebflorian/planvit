import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { FoodEntry, MealType } from '@/types'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
}

interface MealSectionProps {
  type: MealType
  entries: FoodEntry[]
}

export default function MealSection({ type, entries }: MealSectionProps) {
  const totalCal = entries.reduce((sum, e) => sum + e.calories, 0)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: '#FFFFFF' }}>
            {MEAL_LABELS[type]}
          </span>
          {totalCal > 0 && (
            <span className="text-sm tabular-nums" style={{ color: '#A0A0A0' }}>
              {totalCal} kcal
            </span>
          )}
        </div>
        <Link
          href={`/add-food?meal=${type}`}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#242424' }}
        >
          <Plus size={15} color="#FF6B2B" strokeWidth={2.5} />
        </Link>
      </div>

      {/* Entries */}
      {entries.length > 0 && (
        <div style={{ borderTop: '1px solid #2E2E2E' }}>
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/food/${entry.id}`}
              className="flex items-center justify-between px-4 py-3 active:opacity-70"
              style={{ borderBottom: '1px solid #2E2E2E' }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: '#FFFFFF' }}>
                  {entry.food_name}
                </span>
                <span className="text-xs tabular-nums" style={{ color: '#A0A0A0' }}>
                  {entry.quantity_g}g · {entry.protein_g}P · {entry.carbs_g}G · {entry.fat_g}L
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums ml-3 shrink-0" style={{ color: '#FFFFFF' }}>
                {entry.calories} kcal
              </span>
            </Link>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="px-4 pb-3">
          <span className="text-sm" style={{ color: '#A0A0A0' }}>Aucun aliment ajouté</span>
        </div>
      )}
    </div>
  )
}
