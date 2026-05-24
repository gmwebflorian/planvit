'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ArrowLeft, Plus, ChevronRight, Star } from 'lucide-react'
import type { FoodSearchResult } from '@/app/api/food/search/route'
import type { MealType } from '@/types'
import { addFoodEntry, createCustomFood } from '@/app/(dashboard)/actions'

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  dinner: 'Dîner',
  snack: 'Collation',
}
const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const PAGE_SIZE = 15

function calcMacros(food: FoodSearchResult, qty: number) {
  const r = qty / 100
  return {
    calories: Math.round(food.calories_per_100g * r),
    protein_g: Math.round(food.protein_per_100g * r * 10) / 10,
    carbs_g: Math.round(food.carbs_per_100g * r * 10) / 10,
    fat_g: Math.round(food.fat_per_100g * r * 10) / 10,
    fiber_g: food.fiber_per_100g != null ? Math.round(food.fiber_per_100g * r * 10) / 10 : null,
  }
}

const SOURCE_STYLE: Record<string, { bg: string; color: string; label?: string }> = {
  ciqual: { bg: '#FF6B2B20', color: '#FF6B2B', label: 'Ciqual' },
  off:    { bg: '#22C55E20', color: '#22C55E', label: 'OFF' },
  custom: { bg: '#A855F720', color: '#A855F7' },
}

function SourceBadge({ source, customLabel }: { source: 'off' | 'ciqual' | 'custom'; customLabel?: string }) {
  const s = SOURCE_STYLE[source]
  const label = source === 'custom' ? (customLabel ?? 'Moi') : (s.label ?? source)
  return (
    <span
      className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded shrink-0"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {label}
    </span>
  )
}

function normName(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['']/g, "'")
}

export default function AddFoodClient({ favorites = [] }: { favorites?: FoodSearchResult[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMeal = (searchParams.get('meal') as MealType) ?? 'breakfast'

  // Normalized set of favorite names for O(1) lookup
  const favNameSet = useRef(new Set(favorites.map((f) => normName(f.name))))

  const [step, setStep] = useState<'search' | 'quantity' | 'create'>('search')
  const [query, setQuery] = useState('')
  // allResults = full sorted list (favorites first, then rest); displayCount = how many we show
  const [allResults, setAllResults] = useState<FoodSearchResult[]>([])
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<FoodSearchResult | null>(null)
  const [qty, setQty] = useState('100')
  const [meal, setMeal] = useState<MealType>(initialMeal)
  const [saving, setSaving] = useState(false)

  // Create form state
  const [createName, setCreateName] = useState('')
  const [createCal, setCreateCal] = useState('')
  const [createProt, setCreateProt] = useState('')
  const [createCarbs, setCreateCarbs] = useState('')
  const [createFat, setCreateFat] = useState('')
  const [createFiber, setCreateFiber] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step === 'search') inputRef.current?.focus()
  }, [step])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setAllResults([]); setDisplayCount(PAGE_SIZE); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      const raw: FoodSearchResult[] = data.results ?? []

      // For favorited items, replace search data with the stored favorite data
      // so both the empty state and search results show exactly the same card.
      const marked = raw.map((r) => {
        const favMatch = favorites.find((f) => normName(f.name) === normName(r.name))
        if (favMatch) return { ...favMatch, isFavorite: true }
        return { ...r, isFavorite: false }
      })

      // Favorites first, then the rest in their original relevance order
      marked.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1
        if (!a.isFavorite && b.isFavorite) return 1
        return 0
      })

      setAllResults(marked)
      setDisplayCount(PAGE_SIZE)
    } catch {
      setAllResults([])
    } finally {
      setLoading(false)
    }
  }, [favorites]) // favorites is stable (server prop)

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setAllResults([])
    setDisplayCount(PAGE_SIZE)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || displayCount >= allResults.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((c) => Math.min(c + PAGE_SIZE, allResults.length))
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [displayCount, allResults.length])

  const visibleResults = allResults.slice(0, displayCount)
  const hasMore = displayCount < allResults.length

  const handleSelect = (food: FoodSearchResult) => {
    setSelected(food)
    setStep('quantity')
  }

  const handleOpenCreate = () => {
    setCreateName(query)
    setCreateCal('')
    setCreateProt('')
    setCreateCarbs('')
    setCreateFat('')
    setCreateFiber('')
    setStep('create')
  }

  const handleCreate = async () => {
    const cal = parseFloat(createCal)
    if (!createName.trim() || isNaN(cal) || cal <= 0) return
    setSaving(true)
    try {
      const fiber = createFiber ? parseFloat(createFiber) : null
      const id = await createCustomFood({
        name: createName.trim(),
        calories_per_100g: cal,
        protein_per_100g: parseFloat(createProt) || 0,
        carbs_per_100g: parseFloat(createCarbs) || 0,
        fat_per_100g: parseFloat(createFat) || 0,
        fiber_per_100g: fiber,
      })
      const food: FoodSearchResult = {
        id,
        name: createName.trim(),
        brand: null,
        calories_per_100g: cal,
        protein_per_100g: parseFloat(createProt) || 0,
        carbs_per_100g: parseFloat(createCarbs) || 0,
        fat_per_100g: parseFloat(createFat) || 0,
        fiber_per_100g: fiber,
        source: 'custom',
      }
      setSelected(food)
      setStep('quantity')
    } catch {
      // keep form open
    } finally {
      setSaving(false)
    }
  }

  const handleAdd = async () => {
    if (!selected) return
    const qtyNum = parseFloat(qty)
    if (isNaN(qtyNum) || qtyNum <= 0) return
    setSaving(true)
    try {
      await addFoodEntry({
        meal_type: meal,
        food_name: selected.name,
        quantity_g: qtyNum,
        ...calcMacros(selected, qtyNum),
      })
      router.push('/')
      router.refresh()
    } catch {
      setSaving(false)
    }
  }

  const macros = selected && qty ? calcMacros(selected, parseFloat(qty) || 0) : null

  // ── Step: create custom food ──────────────────────────────────────────────
  if (step === 'create') {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => setStep('search')} className="p-1">
            <ArrowLeft size={22} color="#FFFFFF" />
          </button>
          <span className="font-semibold text-lg" style={{ color: '#FFFFFF' }}>Créer un aliment</span>
        </div>

        <div className="flex flex-col gap-4 px-4">
          {[
            { label: 'Nom de l\'aliment', value: createName, set: setCreateName, type: 'text', placeholder: 'Ex: Oeufs brouillés maison' },
            { label: 'Calories (kcal / 100g)', value: createCal, set: setCreateCal, type: 'number', placeholder: '150' },
            { label: 'Protéines (g / 100g)', value: createProt, set: setCreateProt, type: 'number', placeholder: '12' },
            { label: 'Glucides (g / 100g)', value: createCarbs, set: setCreateCarbs, type: 'number', placeholder: '0' },
            { label: 'Lipides (g / 100g)', value: createFat, set: setCreateFat, type: 'number', placeholder: '10' },
            { label: 'Fibres (g / 100g)', value: createFiber, set: setCreateFiber, type: 'number', placeholder: '0' },
          ].map(({ label, value, set, type, placeholder }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#A0A0A0' }}>{label}</label>
              <input
                type={type}
                inputMode={type === 'number' ? 'decimal' : undefined}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="rounded-xl px-4 py-3 text-base outline-none"
                style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E', color: '#FFFFFF' }}
              />
            </div>
          ))}

          <button
            onClick={handleCreate}
            disabled={saving || !createName.trim() || !createCal}
            className="w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-50 mt-2"
            style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
          >
            {saving ? 'Création…' : 'Créer et ajouter'}
          </button>
        </div>
      </div>
    )
  }

  // ── Step: quantity ────────────────────────────────────────────────────────
  if (step === 'quantity' && selected) {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => setStep('search')} className="p-1">
            <ArrowLeft size={22} color="#FFFFFF" />
          </button>
          <span className="font-semibold text-lg truncate" style={{ color: '#FFFFFF' }}>{selected.name}</span>
        </div>

        <div className="flex flex-col gap-4 px-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
            <p className="font-semibold" style={{ color: '#FFFFFF' }}>{selected.name}</p>
            {selected.brand && <p className="text-sm mt-0.5" style={{ color: '#A0A0A0' }}>{selected.brand}</p>}
            <p className="text-xs mt-2" style={{ color: '#A0A0A0' }}>
              Pour 100g : {selected.calories_per_100g} kcal · {selected.protein_per_100g}g P · {selected.carbs_per_100g}g G · {selected.fat_per_100g}g L{selected.fiber_per_100g != null ? ` · ${selected.fiber_per_100g}g F` : ''}
            </p>
          </div>

          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
            <label className="text-sm font-medium" style={{ color: '#A0A0A0' }}>Quantité (grammes)</label>
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
                <button key={g} onClick={() => setQty(String(g))}
                  className="px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ backgroundColor: qty === String(g) ? '#FF6B2B' : '#242424', color: qty === String(g) ? '#FFFFFF' : '#A0A0A0' }}>
                  {g}g
                </button>
              ))}
            </div>
          </div>

          {macros && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold tabular-nums" style={{ color: '#FF6B2B' }}>{macros.calories} kcal</span>
                <div className="flex gap-3 text-sm tabular-nums flex-wrap">
                  <span style={{ color: '#FF6B2B' }}>{macros.protein_g}g P</span>
                  <span style={{ color: '#3B82F6' }}>{macros.carbs_g}g G</span>
                  <span style={{ color: '#EAB308' }}>{macros.fat_g}g L</span>
                  {macros.fiber_g != null && <span style={{ color: '#10B981' }}>{macros.fiber_g}g F</span>}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
            <span className="text-sm font-medium" style={{ color: '#A0A0A0' }}>Repas</span>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((m) => (
                <button key={m} onClick={() => setMeal(m)}
                  className="py-2.5 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: meal === m ? '#FF6B2B' : '#242424', color: meal === m ? '#FFFFFF' : '#A0A0A0' }}>
                  {MEAL_LABELS[m]}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleAdd} disabled={saving || !qty || parseFloat(qty) <= 0}
            className="w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-50"
            style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}>
            {saving ? 'Ajout en cours…' : 'Ajouter au journal'}
          </button>
        </div>
      </div>
    )
  }

  // ── Step: search ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0F0F0F' }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <span className="font-semibold text-lg" style={{ color: '#FFFFFF' }}>Ajouter un aliment</span>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
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
            <div className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: '#A0A0A0', borderTopColor: 'transparent' }} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2">
        {visibleResults.map((food) => (
          <button key={food.id} onClick={() => handleSelect(food)}
            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-left active:opacity-70"
            style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate" style={{ color: '#FFFFFF' }}>{food.name}</span>
                <SourceBadge source={food.source} customLabel={food.customLabel} />
                {food.isFavorite && <Star size={12} fill="#EAB308" color="#EAB308" className="shrink-0" />}
              </div>
              {food.brand && <span className="text-xs" style={{ color: '#A0A0A0' }}>{food.brand}</span>}
              <span className="text-xs tabular-nums" style={{ color: '#A0A0A0' }}>
                {food.calories_per_100g} kcal · {food.protein_per_100g}g P · {food.carbs_per_100g}g G · {food.fat_per_100g}g L{food.fiber_per_100g != null ? ` · ${food.fiber_per_100g}g F` : ''}
              </span>
            </div>
            <ChevronRight size={18} color="#A0A0A0" className="shrink-0 ml-2" />
          </button>
        ))}

        {/* Sentinel pour le scroll infini */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: '#2E2E2E', borderTopColor: '#A0A0A0' }} />
          </div>
        )}

        {query.length >= 2 && !loading && allResults.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-10">
            <p style={{ color: '#A0A0A0' }}>Aucun résultat pour « {query} »</p>
            <button onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-medium"
              style={{ backgroundColor: '#1A1A1A', border: '1px solid #FF6B2B', color: '#FF6B2B' }}>
              <Plus size={18} />
              Créer cet aliment
            </button>
          </div>
        )}

        {query.length >= 2 && !loading && allResults.length > 0 && !hasMore && (
          <button onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium mt-1"
            style={{ backgroundColor: 'transparent', border: '1px dashed #2E2E2E', color: '#A0A0A0' }}>
            <Plus size={15} />
            Créer un aliment personnalisé
          </button>
        )}

        {query.length === 0 && favorites.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-1 pb-1">
              <Star size={13} fill="#EAB308" color="#EAB308" />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#A0A0A0' }}>Favoris</span>
            </div>
            {favorites.map((food) => (
              <button key={food.id} onClick={() => handleSelect(food)}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-left active:opacity-70"
                style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate" style={{ color: '#FFFFFF' }}>{food.name}</span>
                    <SourceBadge source={food.source} customLabel={food.customLabel} />
                  </div>
                  {food.brand && <span className="text-xs" style={{ color: '#A0A0A0' }}>{food.brand}</span>}
                  <span className="text-xs tabular-nums" style={{ color: '#A0A0A0' }}>
                    {food.calories_per_100g} kcal · {food.protein_per_100g}g P · {food.carbs_per_100g}g G · {food.fat_per_100g}g L{food.fiber_per_100g != null ? ` · ${food.fiber_per_100g}g F` : ''}
                  </span>
                </div>
                <ChevronRight size={18} color="#A0A0A0" className="shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}

        {query.length === 0 && favorites.length === 0 && (
          <div className="flex flex-col items-center py-16">
            <p className="text-sm" style={{ color: '#A0A0A0' }}>Tape le nom d&apos;un aliment pour commencer</p>
          </div>
        )}
      </div>
    </div>
  )
}
