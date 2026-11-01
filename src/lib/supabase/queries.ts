import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserProfile, FoodEntry } from '@/types'

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function getDayEntries(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<FoodEntry[]> {
  const { data } = await supabase
    .from('food_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .order('created_at', { ascending: true })
  return data ?? []
}

export type PeriodEntry = Pick<FoodEntry, 'date' | 'calories' | 'protein_g' | 'carbs_g' | 'fat_g' | 'fiber_g'>

export async function getPeriodEntries(
  supabase: SupabaseClient,
  userId: string,
  fromDate: string,
  toDate: string
): Promise<PeriodEntry[]> {
  const { data } = await supabase
    .from('food_entries')
    .select('date, calories, protein_g, carbs_g, fat_g, fiber_g')
    .eq('user_id', userId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date', { ascending: true })
  return (data ?? []) as PeriodEntry[]
}

export async function getFoodEntry(
  supabase: SupabaseClient,
  id: string
): Promise<FoodEntry | null> {
  const { data } = await supabase
    .from('food_entries')
    .select('*')
    .eq('id', id)
    .single()
  return data
}
