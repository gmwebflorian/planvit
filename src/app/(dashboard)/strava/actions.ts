'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { buildStravaAuthorizeUrl } from '@/lib/strava'

export async function connectStrava() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''
  const redirectUri = `${origin}/api/strava/callback`

  redirect(buildStravaAuthorizeUrl(redirectUri))
}

export async function disconnectStrava() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase.from('strava_activities').delete().eq('user_id', user.id)

  const { error } = await supabase
    .from('profiles')
    .update({
      strava_athlete_id: null,
      strava_access_token: null,
      strava_refresh_token: null,
      strava_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/strava')
  revalidatePath('/')
  revalidatePath('/journal')
}
