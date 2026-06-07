const STRAVA_OAUTH_URL = 'https://www.strava.com/oauth/authorize'
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

export const STRAVA_SCOPE = 'activity:read_all'
export const STRAVA_OAUTH_STATE_COOKIE = 'strava_oauth_state'

export function buildStravaAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: STRAVA_SCOPE,
    state,
  })
  return `${STRAVA_OAUTH_URL}?${params.toString()}`
}

export interface StravaTokenResponse {
  token_type: string
  expires_at: number
  expires_in: number
  refresh_token: string
  access_token: string
  athlete?: { id: number }
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`)
  return res.json()
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`)
  return res.json()
}

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

export interface StravaSummaryActivity {
  id: number
  name: string
  sport_type: string
  start_date: string
  elapsed_time: number
  moving_time: number
  distance: number | null
  total_elevation_gain: number | null
  average_heartrate?: number | null
  max_heartrate?: number | null
  average_watts?: number | null
  kilojoules?: number | null
}

export interface StravaDetailedActivity extends StravaSummaryActivity {
  calories?: number | null
}

export async function fetchStravaActivities(accessToken: string, after?: number): Promise<StravaSummaryActivity[]> {
  const params = new URLSearchParams({ per_page: '30' })
  if (after) params.set('after', String(after))
  const res = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`)
  return res.json()
}

export async function fetchStravaActivityDetail(accessToken: string, activityId: number): Promise<StravaDetailedActivity> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Strava activity detail fetch failed: ${res.status}`)
  return res.json()
}

const STRAVA_PUSH_SUBSCRIPTIONS_URL = 'https://www.strava.com/api/v3/push_subscriptions'

export async function createStravaPushSubscription(callbackUrl: string): Promise<{ id: number }> {
  const body = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
    callback_url: callbackUrl,
    verify_token: process.env.STRAVA_VERIFY_TOKEN!,
  })
  const res = await fetch(STRAVA_PUSH_SUBSCRIPTIONS_URL, { method: 'POST', body })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Strava push subscription creation failed: ${res.status} ${text}`)
  }
  return res.json()
}

export async function listStravaPushSubscriptions(): Promise<{ id: number; callback_url: string }[]> {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
  })
  const res = await fetch(`${STRAVA_PUSH_SUBSCRIPTIONS_URL}?${params.toString()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Strava push subscription list failed: ${res.status}`)
  return res.json()
}

// Strava webhook events carry no signature. The subscription_id is only knowable
// by whoever holds our client_id/client_secret, so checking it against our own
// active subscriptions lets us reject events forged by third parties.
export async function isOwnStravaPushSubscription(subscriptionId: number): Promise<boolean> {
  try {
    const subscriptions = await listStravaPushSubscriptions()
    return subscriptions.some((s) => s.id === subscriptionId)
  } catch {
    return false
  }
}
