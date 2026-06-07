import { createAdminClient } from '@/lib/supabase/admin'
import { refreshStravaToken, fetchStravaActivityDetail, type StravaDetailedActivity } from '@/lib/strava'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && challenge && token === process.env.STRAVA_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge })
  }

  return NextResponse.json({ error: 'invalid verification request' }, { status: 403 })
}

interface StravaWebhookEvent {
  object_type: 'activity' | 'athlete'
  object_id: number
  aspect_type: 'create' | 'update' | 'delete'
  owner_id: number
  subscription_id: number
  event_time: number
}

function toActivityRow(userId: string, detail: StravaDetailedActivity) {
  return {
    user_id: userId,
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
  }
}

async function handleActivityEvent(event: StravaWebhookEvent) {
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, strava_access_token, strava_refresh_token, strava_token_expires_at')
    .eq('strava_athlete_id', event.owner_id)
    .maybeSingle()

  if (!profile) return

  if (event.aspect_type === 'delete') {
    await supabase
      .from('strava_activities')
      .delete()
      .eq('user_id', profile.id)
      .eq('strava_activity_id', event.object_id)
    return
  }

  if (!profile.strava_access_token || !profile.strava_refresh_token) return

  let accessToken = profile.strava_access_token
  const expiresAtMs = profile.strava_token_expires_at ? new Date(profile.strava_token_expires_at).getTime() : 0

  if (expiresAtMs <= Date.now() + 5 * 60 * 1000) {
    try {
      const refreshed = await refreshStravaToken(profile.strava_refresh_token)
      accessToken = refreshed.access_token
      await supabase
        .from('profiles')
        .update({
          strava_access_token: refreshed.access_token,
          strava_refresh_token: refreshed.refresh_token,
          strava_token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
    } catch {
      return
    }
  }

  try {
    const detail = await fetchStravaActivityDetail(accessToken, event.object_id)
    await supabase
      .from('strava_activities')
      .upsert(toActivityRow(profile.id, detail), { onConflict: 'user_id,strava_activity_id' })
  } catch {
    // Ignored — a manual sync will pick it up later.
  }
}

export async function POST(request: NextRequest) {
  const event: StravaWebhookEvent = await request.json()

  if (event.object_type === 'activity') {
    await handleActivityEvent(event)
  }

  return NextResponse.json({}, { status: 200 })
}
