'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { MealType } from '@/types'

interface AddFoodEntryInput {
  meal_type: MealType
  food_name: string
  quantity_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number | null
  custom_food_id?: string | null
}

export async function addFoodEntry(input: AddFoodEntryInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('food_entries').insert({
    user_id: user.id,
    date: today,
    meal_type: input.meal_type,
    food_name: input.food_name,
    quantity_g: input.quantity_g,
    calories: input.calories,
    protein_g: input.protein_g,
    carbs_g: input.carbs_g,
    fat_g: input.fat_g,
    fiber_g: input.fiber_g ?? null,
    custom_food_id: input.custom_food_id ?? null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export interface CreateCustomFoodInput {
  name: string
  brand?: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
}

export async function createCustomFood(input: CreateCustomFoodInput): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const meta = user.user_metadata ?? {}
  const creatorName: string =
    meta.given_name ||
    (meta.full_name ?? meta.name ?? '').split(' ')[0] ||
    'Utilisateur'

  const { data, error } = await supabase
    .from('custom_foods')
    .insert({
      user_id: user.id,
      name: input.name,
      brand: input.brand ?? null,
      calories_per_100g: input.calories_per_100g,
      protein_per_100g: input.protein_per_100g,
      carbs_per_100g: input.carbs_per_100g,
      fat_per_100g: input.fat_per_100g,
      creator_name: creatorName,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id
}

export async function deleteFoodEntry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('food_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  redirect('/')
}

export interface FavoriteFood {
  food_name: string
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  brand?: string | null
  source?: string | null
  custom_label?: string | null
}

export async function toggleFavorite(food: FavoriteFood): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('food_name', food.food_name)
    .maybeSingle()

  if (existing) {
    await supabase.from('favorites').delete().eq('id', existing.id)
    revalidatePath('/add-food')
    return false
  } else {
    await supabase.from('favorites').insert({
      user_id: user.id,
      food_name: food.food_name,
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
      brand: food.brand ?? null,
      source: food.source ?? null,
      custom_label: food.custom_label ?? null,
    })
    revalidatePath('/add-food')
    return true
  }
}
