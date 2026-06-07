import { createClient } from '@/lib/supabase/server'
import { exchangeStravaCode, STRAVA_OAUTH_STATE_COOKIE } from '@/lib/strava'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  if (error) {
    return NextResponse.redirect(`${origin}/strava?error=denied`)
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/strava?error=missing_code`)
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(STRAVA_OAUTH_STATE_COOKIE)?.value
  cookieStore.delete(STRAVA_OAUTH_STATE_COOKIE)

  // Reject the exchange if the state doesn't match — prevents an attacker from
  // tricking a logged-in user into linking the attacker's own Strava account.
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/strava?error=invalid_state`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  try {
    const token = await exchangeStravaCode(code)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        strava_athlete_id: token.athlete?.id ?? null,
        strava_access_token: token.access_token,
        strava_refresh_token: token.refresh_token,
        strava_token_expires_at: new Date(token.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.redirect(`${origin}/strava?error=save_failed`)
    }

    return NextResponse.redirect(`${origin}/strava?connected=1`)
  } catch {
    return NextResponse.redirect(`${origin}/strava?error=token_exchange`)
  }
}
