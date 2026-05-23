export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type Sex = 'male' | 'female'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  sex: Sex | null
  birth_date: string | null
  height_cm: number | null
  weight_kg: number | null
  goal_calories: number | null
  goal_protein_g: number | null
  goal_carbs_g: number | null
  goal_fat_g: number | null
  strava_athlete_id: number | null
  strava_access_token: string | null
  strava_refresh_token: string | null
  strava_token_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface FoodEntry {
  id: string
  user_id: string
  date: string
  meal_type: MealType
  food_name: string
  quantity_g: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  custom_food_id: string | null
  created_at: string
  updated_at: string
}

export interface DailySummary {
  id: string
  user_id: string
  date: string
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
  total_fiber_g: number
  calories_burned: number
  net_calories: number
  created_at: string
  updated_at: string
}

export interface StravaActivity {
  id: string
  user_id: string
  strava_activity_id: number
  name: string
  sport_type: string
  start_date: string
  elapsed_time_s: number
  moving_time_s: number
  distance_m: number | null
  total_elevation_gain_m: number | null
  average_heartrate: number | null
  max_heartrate: number | null
  calories: number | null
  average_watts: number | null
  kilojoules: number | null
  raw_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface CustomFood {
  id: string
  user_id: string
  name: string
  brand: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number | null
  serving_size_g: number | null
  barcode: string | null
  created_at: string
  updated_at: string
}
