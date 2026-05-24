'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { toggleFavorite } from '@/app/(dashboard)/actions'
import type { FavoriteFood } from '@/app/(dashboard)/actions'

export function FavoriteButton({ isFavorite, food }: { isFavorite: boolean; food: FavoriteFood }) {
  const [isFav, setIsFav] = useState(isFavorite)
  const [, startTransition] = useTransition()

  const handleToggle = () => {
    const next = !isFav
    setIsFav(next)
    startTransition(async () => {
      try {
        await toggleFavorite(food)
      } catch {
        setIsFav(!next)
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      className="p-1 shrink-0"
      aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Star
        size={22}
        fill={isFav ? '#EAB308' : 'transparent'}
        color={isFav ? '#EAB308' : '#A0A0A0'}
      />
    </button>
  )
}
