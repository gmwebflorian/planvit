import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AddFoodClient from './AddFoodClient'
import type { FoodSearchResult } from '@/app/api/food/search/route'

async function getFavorites(): Promise<FoodSearchResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('favorites')
    .select('food_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, brand, source, custom_label')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []).map((f) => ({
    id: `fav_${f.food_name}`,
    name: f.food_name,
    brand: f.brand ?? null,
    calories_per_100g: f.calories_per_100g,
    protein_per_100g: f.protein_per_100g,
    carbs_per_100g: f.carbs_per_100g,
    fat_per_100g: f.fat_per_100g,
    source: (f.source as 'ciqual' | 'off' | 'custom') ?? 'ciqual',
    customLabel: f.custom_label ?? undefined,
  }))
}

export default async function AddFoodPage() {
  const favorites = await getFavorites()

  return (
    <Suspense>
      <AddFoodClient favorites={favorites} />
    </Suspense>
  )
}
