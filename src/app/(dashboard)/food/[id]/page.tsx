import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getFoodEntry } from '@/lib/supabase/queries'
import { deleteFoodEntry } from '@/app/(dashboard)/actions'
import { FavoriteButton } from '@/components/FavoriteButton'
import type { FavoriteFood } from '@/app/(dashboard)/actions'

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
}

export default async function FoodDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entry = await getFoodEntry(supabase, id)
  if (!entry || entry.user_id !== user.id) notFound()

  // Per-100g macros (needed to re-add via favorites)
  const q = Number(entry.quantity_g)
  const favoriteFood: FavoriteFood = {
    food_name: entry.food_name,
    calories_per_100g: Math.round((Number(entry.calories) / q) * 1000) / 10,
    protein_per_100g:  Math.round((Number(entry.protein_g) / q) * 1000) / 10,
    carbs_per_100g:    Math.round((Number(entry.carbs_g)   / q) * 1000) / 10,
    fat_per_100g:      Math.round((Number(entry.fat_g)     / q) * 1000) / 10,
    fiber_per_100g:    entry.fiber_g != null ? Math.round((Number(entry.fiber_g) / q) * 1000) / 10 : null,
    source: entry.custom_food_id ? 'custom' : null,
  }

  const { data: favRow } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('food_name', entry.food_name)
    .maybeSingle()

  const isFavorite = !!favRow

  const deleteAction = async () => {
    'use server'
    await deleteFoodEntry(id)
  }

  return (
    <div className="flex flex-col min-h-screen px-4 pt-5 gap-5" style={{ backgroundColor: '#0F0F0F' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/" className="p-1">
          <ArrowLeft size={22} color="#FFFFFF" />
        </Link>
        <span className="font-semibold text-lg" style={{ color: '#FFFFFF' }}>
          Détail de l&apos;aliment
        </span>
      </div>

      {/* Food card */}
      <div
        className="rounded-2xl p-5 flex flex-col gap-4"
        style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>{entry.food_name}</h2>
            <FavoriteButton isFavorite={isFavorite} food={favoriteFood} />
          </div>
          <p className="text-sm" style={{ color: '#A0A0A0' }}>
            {MEAL_LABELS[entry.meal_type]} · {entry.quantity_g}g
          </p>
        </div>

        <div className="h-px w-full" style={{ backgroundColor: '#2E2E2E' }} />

        <div className="grid grid-cols-2 gap-3">
          <Macro label="Calories" value={`${Math.round(entry.calories)} kcal`} color="#FF6B2B" />
          <Macro label="Protéines" value={`${entry.protein_g}g`} color="#FF6B2B" />
          <Macro label="Glucides" value={`${entry.carbs_g}g`} color="#3B82F6" />
          <Macro label="Lipides" value={`${entry.fat_g}g`} color="#EAB308" />
          {entry.fiber_g != null && (
            <Macro label="Fibres" value={`${entry.fiber_g}g`} color="#10B981" />
          )}
        </div>

        <p className="text-xs" style={{ color: '#A0A0A0' }}>
          Ajouté le {new Date(entry.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>

      {/* Delete */}
      <form action={deleteAction}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold"
          style={{ backgroundColor: '#1A1A1A', border: '1px solid #EF4444', color: '#EF4444' }}
        >
          <Trash2 size={18} />
          Supprimer cet aliment
        </button>
      </form>
    </div>
  )
}

function Macro({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1" style={{ backgroundColor: '#242424' }}>
      <span className="text-xs" style={{ color: '#A0A0A0' }}>{label}</span>
      <span className="text-lg font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  )
}
