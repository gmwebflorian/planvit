import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Only allow same-origin relative paths — rejects protocol-relative ("//evil.com"),
// backslash ("/\evil.com") and userinfo-style ("@evil.com") redirect targets.
function sanitizeNextPath(value: string | null): string {
  if (value && /^\/(?!\/|\\)[^\s@]*$/.test(value)) return value
  return '/'
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback`)
}
