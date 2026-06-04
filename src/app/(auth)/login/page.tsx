import { signInWithGoogle } from '@/app/(auth)/actions'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#E8E2D6' }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-10">

        {/* Logo & branding */}
        <div className="flex flex-col items-center gap-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Carré vert avec V */}
            <div style={{
              width: 72,
              height: 72,
              backgroundColor: '#0B6F48',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 0 rgba(0,0,0,0.12)',
            }}>
              <span style={{
                fontFamily: 'var(--font-montserrat), sans-serif',
                fontWeight: 900,
                fontSize: 42,
                lineHeight: '1',
                color: '#E8E2D6',
                letterSpacing: '-2.5px',
              }}>V</span>
            </div>
            {/* plan VIT */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-montserrat), sans-serif',
                fontWeight: 300,
                fontSize: 13,
                color: '#000000',
                letterSpacing: '4.5px',
                textTransform: 'uppercase',
                lineHeight: '1.5',
              }}>plan</span>
              <span style={{
                fontFamily: 'var(--font-montserrat), sans-serif',
                fontWeight: 900,
                fontSize: 32,
                color: '#0B6F48',
                letterSpacing: '-1.2px',
                lineHeight: '1',
              }}>VIT</span>
            </div>
          </div>
          <p className="text-sm text-center" style={{ color: '#6B6457' }}>
            Suis tes macros, atteins tes objectifs.
          </p>
        </div>

        {/* Sign in form */}
        <form action={signInWithGoogle} className="w-full">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-base transition-opacity active:opacity-70"
            style={{ backgroundColor: '#FFFFFF', color: '#0F0F0F', border: '1px solid #DDD7CC' }}
          >
            <GoogleIcon />
            Continuer avec Google
          </button>
        </form>

        <p className="text-xs text-center" style={{ color: '#6B6457' }}>
          En continuant, tu acceptes nos conditions d&apos;utilisation.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
