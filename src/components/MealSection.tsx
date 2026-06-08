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
  date: string
}

export default function MealSection({ type, entries, date }: MealSectionProps) {
  const totalCal = entries.reduce((sum, e) => sum + e.calories, 0)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: '#0F0F0F' }}>
            {MEAL_LABELS[type]}
          </span>
          {totalCal > 0 && (
            <span className="text-sm tabular-nums" style={{ color: '#6B6457' }}>
              {totalCal} kcal
            </span>
          )}
        </div>
        <Link
          href={`/add-food?meal=${type}&date=${date}`}
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: '#F0EBE3' }}
        >
          <Plus size={15} color="#FF6B2B" strokeWidth={2.5} />
        </Link>
      </div>

      {/* Entries */}
      {entries.length > 0 && (
        <div style={{ borderTop: '1px solid #DDD7CC' }}>
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/food/${entry.id}`}
              className="flex items-center justify-between px-4 py-3 active:opacity-70"
              style={{ borderBottom: '1px solid #DDD7CC' }}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: '#0F0F0F' }}>
                  {entry.food_name}
                </span>
                <span className="text-xs tabular-nums" style={{ color: '#6B6457' }}>
                  {entry.quantity_g}g · {entry.protein_g}P · {entry.carbs_g}G · {entry.fat_g}L
                </span>
              </div>
              <span className="text-sm font-semibold tabular-nums ml-3 shrink-0" style={{ color: '#0F0F0F' }}>
                {entry.calories} kcal
              </span>
            </Link>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <div className="px-4 pb-3">
          <span className="text-sm" style={{ color: '#6B6457' }}>Aucun aliment ajouté</span>
        </div>
      )}
    </div>
  )
}
