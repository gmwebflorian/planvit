import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/queries'
import ProfileClient from './ProfileClient'

function calcAge(birthDate: string): number {
  const dob = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function calcBMR(profile: { sex: string | null; weight_kg: number | null; height_cm: number | null; birth_date: string | null }): number | null {
  if (!profile.sex || !profile.weight_kg || !profile.height_cm || !profile.birth_date) return null
  const age = calcAge(profile.birth_date)
  if (profile.sex === 'male') {
    return 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age + 5
  }
  return 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * age - 161
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  const bmr = calcBMR(profile)

  return (
    <ProfileClient
      profile={profile}
      email={user.email ?? ''}
      bmr={bmr}
    />
  )
}
