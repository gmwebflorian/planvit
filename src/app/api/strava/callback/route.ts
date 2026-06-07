import { createClient } from '@/lib/supabase/server'
import { exchangeStravaCode } from '@/lib/strava'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/strava?error=denied`)
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/strava?error=missing_code`)
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
