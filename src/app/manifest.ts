import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PlanVIT',
    short_name: 'PlanVIT',
    description: 'Plan your nutrition and training with PlanVIT',
    start_url: '/',
    display: 'standalone',
    background_color: '#E8E2D6',
    theme_color: '#E8E2D6',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
