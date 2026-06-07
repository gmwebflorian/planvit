'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/queries'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import {
  buildStravaAuthorizeUrl,
  refreshStravaToken,
  fetchStravaActivities,
  fetchStravaActivityDetail,
  createStravaPushSubscription,
  type StravaDetailedActivity,
} from '@/lib/strava'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserProfile } from '@/types'

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

async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string,
  profile: Pick<UserProfile, 'strava_access_token' | 'strava_refresh_token' | 'strava_token_expires_at'>
): Promise<string | null> {
  if (!profile.strava_access_token || !profile.strava_refresh_token) return null

  const expiresAtMs = profile.strava_token_expires_at ? new Date(profile.strava_token_expires_at).getTime() : 0
  if (expiresAtMs > Date.now() + 5 * 60 * 1000) {
    return profile.strava_access_token
  }

  const refreshed = await refreshStravaToken(profile.strava_refresh_token)
  await supabase
    .from('profiles')
    .update({
      strava_access_token: refreshed.access_token,
      strava_refresh_token: refreshed.refresh_token,
      strava_token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  return refreshed.access_token
}

export async function syncStrava() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(supabase, user.id)
  if (!profile?.strava_access_token || !profile.strava_refresh_token) {
    redirect('/strava?error=not_connected')
  }

  let syncedCount = 0
  let errorCode: string | null = null

  try {
    const accessToken = await getValidAccessToken(supabase, user.id, profile)
    if (!accessToken) throw new Error('no_token')

    const after = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60
    const summaries = await fetchStravaActivities(accessToken, after)
    const ids = summaries.map((a) => a.id)

    const { data: existing } = ids.length
      ? await supabase
          .from('strava_activities')
          .select('strava_activity_id')
          .eq('user_id', user.id)
          .in('strava_activity_id', ids)
      : { data: [] as { strava_activity_id: number }[] }

    const existingIds = new Set((existing ?? []).map((a) => a.strava_activity_id))
    const newActivities = summaries.filter((a) => !existingIds.has(a.id))

    const rows = []
    for (const summary of newActivities) {
      let detail: StravaDetailedActivity = summary
      try {
        detail = await fetchStravaActivityDetail(accessToken, summary.id)
      } catch {}

      rows.push({
        user_id: user.id,
        strava_activity_id: detail.id,
        name: detail.name,
        sport_type: detail.sport_type,
        start_date: detail.start_date,
        elapsed_time_s: detail.elapsed_time,
        moving_time_s: detail.moving_time,
        distance_m: detail.distance ?? null,
        total_elevation_gain_m: detail.total_elevation_gain ?? null,
        average_heartrate: detail.average_heartrate ?? null,
        max_heartrate: detail.max_heartrate ?? null,
        calories: detail.calories ?? null,
        average_watts: detail.average_watts ?? null,
        kilojoules: detail.kilojoules ?? null,
        raw_data: detail as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from('strava_activities')
        .upsert(rows, { onConflict: 'user_id,strava_activity_id' })
      if (error) throw new Error(error.message)
    }

    syncedCount = rows.length
  } catch {
    errorCode = 'sync_failed'
  }

  revalidatePath('/strava')
  revalidatePath('/')
  revalidatePath('/journal')

  redirect(errorCode ? `/strava?error=${errorCode}` : `/strava?synced=${syncedCount}`)
}

export async function enableStravaWebhook() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''
  const callbackUrl = `${origin}/api/strava/webhook`

  let status: 'created' | 'exists' | 'failed' = 'failed'
  try {
    await createStravaPushSubscription(callbackUrl)
    status = 'created'
  } catch (e) {
    if (e instanceof Error && e.message.toLowerCase().includes('already exists')) {
      status = 'exists'
    }
  }

  redirect(`/strava?webhook=${status}`)
}
