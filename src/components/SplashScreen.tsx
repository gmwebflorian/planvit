'use client'

import { useLayoutEffect, useState } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)

  useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem('planvit_splash')) return
      sessionStorage.setItem('planvit_splash', '1')
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 1600)
      return () => clearTimeout(t)
    } catch {
      // sessionStorage indisponible
    }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#E8E2D6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Carré vert avec V */}
        <div
          style={{
            width: 90,
            height: 90,
            backgroundColor: '#0B6F48',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 0 rgba(0,0,0,0.12)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-montserrat), sans-serif',
              fontWeight: 900,
              fontSize: 52,
              lineHeight: '1',
              color: '#E8E2D6',
              letterSpacing: '-3px',
            }}
          >
            V
          </span>
        </div>

        {/* plan VIT */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-montserrat), sans-serif',
              fontWeight: 300,
              fontSize: 16,
              color: '#000000',
              letterSpacing: '5.5px',
              textTransform: 'uppercase',
              lineHeight: '1.5',
            }}
          >
            plan
          </span>
          <span
            style={{
              fontFamily: 'var(--font-montserrat), sans-serif',
              fontWeight: 900,
              fontSize: 40,
              color: '#0B6F48',
              letterSpacing: '-1.5px',
              lineHeight: '1',
            }}
          >
            VIT
          </span>
        </div>
      </div>
    </div>
  )
}
