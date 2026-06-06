'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Plus, Bike, User } from 'lucide-react'

const tabs = [
  { href: '/', icon: Home, label: "Aujourd'hui" },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/add-food', icon: Plus, label: 'Ajouter', isFab: true },
  { href: '/strava', icon: Bike, label: 'Strava' },
  { href: '/profile', icon: User, label: 'Profil' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center pb-safe"
      style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #DDD7CC', height: '72px' }}
    >
      {tabs.map(({ href, icon: Icon, label, isFab }) => {
        const isActive = pathname === href

        if (isFab) {
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center">
              <span
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-md"
                style={{ backgroundColor: '#FF6B2B' }}
              >
                <Icon size={22} color="#FFFFFF" strokeWidth={2.5} />
              </span>
            </Link>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1"
          >
            <Icon
              size={22}
              color={isActive ? '#FF6B2B' : '#A0A0A0'}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: isActive ? '#FF6B2B' : '#A0A0A0' }}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
