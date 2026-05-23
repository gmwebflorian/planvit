'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ArrowLeft, Plus, ChevronRight } from 'lucide-react'
import type { FoodSearchResult } from '@/app/api/food/search/route'
import type { MealType } from '@/types'
import { addFoodEntry } from '@/app/(dashboard)/actions'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

function calcMacros(food: FoodSearchResult, qty: number) {
  const ratio = qty / 100
  return {
    calories: Math.round(food.calories_per_100g * ratio),
    protein_g: Math.round(food.protein_per_100g * ratio * 10) / 10,
    carbs_g: Math.round(food.carbs_per_100g * ratio * 10) / 10,
    fat_g: Math.round(food.fat_per_100g * ratio * 10) / 10,
  }
}

export default function AddFoodClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMeal = (searchParams.get('meal') as MealType) ?? 'breakfast'

  const [step, setStep] = useState<'search' | 'quantity'>('search')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<FoodSearchResult | null>(null)
  const [qty, setQty] = useState('100')
  const [meal, setMeal] = useState<MealType>(initialMeal)
  const [saving, setSaving] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (step === 'search') inputRef.current?.focus()
  }, [step])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleQueryChange = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelect = (food: FoodSearchResult) => {
    setSelected(food)
    setStep('quantity')
  }

  const handleAdd = async () => {
    if (!selected) return
    const qtyNum = parseFloat(qty)
    if (isNaN(qtyNum) || qtyNum <= 0) return

    setSaving(true)
    const macros = calcMacros(selected, qtyNum)

    try {
      await addFoodEntry({
        meal_type: meal,
        food_name: selected.name,
        quantity_g: qtyNum,
        ...macros,
      })
      router.push('/')
      router.refresh()
    } catch {
      setSaving(false)
    }
  }

  const macros = selected && qty ? calcMacros(selected, parseFloat(qty) || 0) : null

  if (step === 'quantity' && selected) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => setStep('search')} className="p-1">
            <ArrowLeft size={22} color="#FFFFFF" />
          </button>
          <span className="font-semibold text-lg truncate" style={{ color: '#FFFFFF' }}>
            {selected.name}
          </span>
        </div>

        <div className="flex flex-col gap-4 px-4">
          {/* Food info */}
          <div
            className="rounded-2xl p-4"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
          >
            <p className="font-semibold" style={{ color: '#FFFFFF' }}>{selected.name}</p>
            {selected.brand && (
              <p className="text-sm mt-0.5" style={{ color: '#A0A0A0' }}>{selected.brand}</p>
            )}
            <p className="text-xs mt-2" style={{ color: '#A0A0A0' }}>
              Pour 100g : {selected.calories_per_100g} kcal · {selected.protein_per_100g}g P · {selected.carbs_per_100g}g G · {selected.fat_per_100g}g L
            </p>
          </div>

          {/* Quantity input */}
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
          >
            <label className="text-sm font-medium" style={{ color: '#A0A0A0' }}>
              Quantité (grammes)
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              autoFocus
              className="text-4xl font-bold text-center w-full bg-transparent outline-none tabular-nums"
              style={{ color: '#FFFFFF' }}
              placeholder="100"
            />
            <div className="flex gap-2 justify-center">
              {[50, 100, 150, 200].map((g) => (
                <button
                  key={g}
                  onClick={() => setQty(String(g))}
                  className="px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: qty === String(g) ? '#FF6B2B' : '#242424',
                    color: qty === String(g) ? '#FFFFFF' : '#A0A0A0',
                  }}
                >
                  {g}g
                </button>
              ))}
            </div>
          </div>

          {/* Real-time macro preview */}
          {macros && (
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold tabular-nums" style={{ color: '#FF6B2B' }}>
                  {macros.calories} kcal
                </span>
                <div className="flex gap-3 text-sm tabular-nums">
                  <span style={{ color: '#FF6B2B' }}>{macros.protein_g}g P</span>
                  <span style={{ color: '#3B82F6' }}>{macros.carbs_g}g G</span>
                  <span style={{ color: '#EAB308' }}>{macros.fat_g}g L</span>
                </div>
              </div>
            </div>
          )}

          {/* Meal selector */}
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
          >
            <span className="text-sm font-medium" style={{ color: '#A0A0A0' }}>Repas</span>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMeal(m)}
                  className="py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    backgroundColor: meal === m ? '#FF6B2B' : '#242424',
                    color: meal === m ? '#FFFFFF' : '#A0A0A0',
                  }}
                >
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={saving || !qty || parseFloat(qty) <= 0}
            className="w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-50"
            style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
          >
            {saving ? 'Ajout en cours…' : 'Ajouter au journal'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <span className="font-semibold text-lg" style={{ color: '#FFFFFF' }}>
          Ajouter un aliment
        </span>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-3">
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
        >
          <Search size={18} color="#A0A0A0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Rechercher un aliment…"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: '#FFFFFF' }}
          />
          {loading && (
            <div
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: '#A0A0A0', borderTopColor: 'transparent' }}
            />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2">
        {results.length > 0 && results.map((food) => (
          <button
            key={food.id}
            onClick={() => handleSelect(food)}
            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-left active:opacity-70"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium truncate" style={{ color: '#FFFFFF' }}>
                {food.name}
              </span>
              {food.brand && (
                <span className="text-xs" style={{ color: '#A0A0A0' }}>{food.brand}</span>
              )}
              <span className="text-xs tabular-nums" style={{ color: '#A0A0A0' }}>
                {food.calories_per_100g} kcal · {food.protein_per_100g}g P · {food.carbs_per_100g}g G · {food.fat_per_100g}g L
              </span>
            </div>
            <ChevronRight size={18} color="#A0A0A0" className="shrink-0 ml-2" />
          </button>
        ))}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-10">
            <p style={{ color: '#A0A0A0' }}>Aucun résultat pour « {query} »</p>
            <button
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-medium"
              style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E', color: '#FF6B2B' }}
            >
              <Plus size={18} />
              Créer cet aliment
            </button>
          </div>
        )}

        {query.length === 0 && (
          <div className="flex flex-col items-center py-16">
            <p className="text-sm" style={{ color: '#A0A0A0' }}>
              Tape le nom d&apos;un aliment pour commencer
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
