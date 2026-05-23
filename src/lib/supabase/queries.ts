import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserProfile, FoodEntry, StravaActivity } from '@/types'

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

export async function getDayStravaCalories(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<number> {
  const dayStart = `${date}T00:00:00Z`
  const dayEnd = `${date}T23:59:59Z`
  const { data } = await supabase
    .from('strava_activities')
    .select('calories')
    .eq('user_id', userId)
    .gte('start_date', dayStart)
    .lte('start_date', dayEnd)
  if (!data) return 0
  return data.reduce((sum: number, a: Pick<StravaActivity, 'calories'>) => sum + (a.calories ?? 0), 0)
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
