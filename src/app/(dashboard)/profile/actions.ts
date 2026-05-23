'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Sex } from '@/types'

interface UpdateProfileInput {
  full_name?: string
  sex?: Sex | null
  birth_date?: string | null
  height_cm?: number | null
  weight_kg?: number | null
  goal_calories?: number | null
  goal_protein_g?: number | null
  goal_carbs_g?: number | null
  goal_fat_g?: number | null
}

export async function updateProfile(input: UpdateProfileInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/profile')
  revalidatePath('/')
}
