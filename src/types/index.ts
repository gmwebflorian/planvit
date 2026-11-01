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
  goal_fiber_g: number | null
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
