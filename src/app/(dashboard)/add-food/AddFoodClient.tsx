'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ArrowLeft, Plus, ChevronRight, Star, CalendarClock, Camera, ChefHat, Loader2, MessageSquare, X } from 'lucide-react'
import type { FoodSearchResult } from '@/app/api/food/search/route'
import type { RecipeAnalysis, RecipeIngredient } from '@/app/api/food/analyze-recipe/route'
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
  custom: { bg: '#A855F720', color: '#A855F7' },
}

function SourceBadge({ source, customLabel }: { source: 'ciqual' | 'custom'; customLabel?: string }) {
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
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, "'")
}

// Returns null for today (no need to call it out), otherwise the formatted
// date so the user clearly sees which day they're logging a meal for.
function pastDateLabel(dateStr: string, today: string): string | null {
  if (dateStr === today) return null
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function DateBadge({ label }: { label: string }) {
  return (
    <div className="px-4 pb-3">
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold capitalize"
        style={{ backgroundColor: '#FFF1E8', color: '#FF6B2B' }}
      >
        <CalendarClock size={13} strokeWidth={2.5} />
        Ajout pour {label}
      </span>
    </div>
  )
}

export default function AddFoodClient({ favorites = [] }: { favorites?: FoodSearchResult[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialMeal = (searchParams.get('meal') as MealType) ?? 'breakfast'
  const today = new Date().toISOString().split('T')[0]
  const dateParam = searchParams.get('date')
  const entryDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= today ? dateParam : today
  const dateLabel = pastDateLabel(entryDate, today)

  // Normalized set of favorite names for O(1) lookup
  const favNameSet = useRef(new Set(favorites.map((f) => normName(f.name))))

  const [step, setStep] = useState<'search' | 'quantity' | 'create' | 'recipe' | 'describe'>('search')
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

  const [recipeAnalysis, setRecipeAnalysis] = useState<RecipeAnalysis | null>(null)
  const [recipeAnalyzing, setRecipeAnalyzing] = useState(false)
  const [recipeServings, setRecipeServings] = useState(4)
  const [recipeDishName, setRecipeDishName] = useState('')
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [describeText, setDescribeText] = useState('')

  type EditableIngredient = RecipeIngredient & { _id: string }
  const [editedIngredients, setEditedIngredients] = useState<EditableIngredient[]>([])
  const [macroOverride, setMacroOverride] = useState<{ kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null>(null)
  const [addingIngredient, setAddingIngredient] = useState(false)
  const [newIngName, setNewIngName] = useState('')
  const [newIngQty, setNewIngQty] = useState('')
  const [newIngKcal, setNewIngKcal] = useState('')
  const [newIngProt, setNewIngProt] = useState('')
  const [newIngCarbs, setNewIngCarbs] = useState('')
  const [newIngFat, setNewIngFat] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step === 'search') inputRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (recipeAnalysis) {
      setEditedIngredients(recipeAnalysis.ingredients.map((ing, i) => ({ ...ing, _id: String(i) })))
      setMacroOverride(null)
      setAddingIngredient(false)
    }
  }, [recipeAnalysis])

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

  async function compressImage(file: File): Promise<{ base64: string; mediaType: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1600
        let w = img.width, h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX }
          else { w = Math.round(w * MAX / h); h = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        // PNG screenshots stay lossless so text stays readable; JPEG photos use high quality
        const isPng = file.type === 'image/png'
        const mimeType = isPng ? 'image/png' : 'image/jpeg'
        const base64 = canvas.toDataURL(mimeType, isPng ? undefined : 0.92).split(',')[1]
        resolve({ base64, mediaType: mimeType })
      }
      img.onerror = reject
      img.src = url
    })
  }

  const handleRecipeFile = async (file: File) => {
    setRecipeError(null)
    setRecipeAnalyzing(true)
    setStep('recipe')
    try {
      const { base64, mediaType } = await compressImage(file)
      const res = await fetch('/api/food/analyze-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType }),
      })
      if (!res.ok) {
        setRecipeError('L\'IA n\'a pas réussi à analyser l\'image. Essaie avec une photo contenant les ingrédients et les quantités.')
        return
      }
      const analysis: RecipeAnalysis = await res.json()
      setRecipeAnalysis(analysis)
      setRecipeServings(analysis.servings)
      setRecipeDishName(analysis.dish_name)
    } catch {
      setRecipeError('Une erreur est survenue. Vérifie ta connexion et réessaie.')
    } finally {
      setRecipeAnalyzing(false)
    }
  }

  const handleDescribeDish = async () => {
    if (!describeText.trim()) return
    setRecipeError(null)
    setRecipeAnalyzing(true)
    setStep('recipe')
    try {
      const res = await fetch('/api/food/describe-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: describeText }),
      })
      if (!res.ok) {
        setRecipeError('L\'IA n\'a pas réussi à estimer ce plat. Essaie avec plus de détails sur les ingrédients.')
        return
      }
      const analysis: RecipeAnalysis = await res.json()
      setRecipeAnalysis(analysis)
      setRecipeServings(analysis.servings)
      setRecipeDishName(analysis.dish_name)
    } catch {
      setRecipeError('Une erreur est survenue. Vérifie ta connexion et réessaie.')
    } finally {
      setRecipeAnalyzing(false)
    }
  }

  const editedTotalWeight = editedIngredients.reduce((s, i) => s + i.quantity_g, 0)
  const displayServingWeight = editedTotalWeight > 0
    ? Math.round(editedTotalWeight / recipeServings)
    : recipeAnalysis ? Math.round(recipeAnalysis.total_weight_g / recipeServings) : 0

  const computedPerServing = recipeAnalysis ? {
    kcal: editedIngredients.length > 0
      ? Math.round(editedIngredients.reduce((s, i) => s + i.kcal, 0) / recipeServings)
      : Math.round(recipeAnalysis.per_serving.kcal * recipeAnalysis.servings / recipeServings),
    protein_g: editedIngredients.length > 0
      ? Math.round(editedIngredients.reduce((s, i) => s + i.protein_g, 0) / recipeServings * 10) / 10
      : Math.round(recipeAnalysis.per_serving.protein_g * recipeAnalysis.servings / recipeServings * 10) / 10,
    carbs_g: editedIngredients.length > 0
      ? Math.round(editedIngredients.reduce((s, i) => s + i.carbs_g, 0) / recipeServings * 10) / 10
      : Math.round(recipeAnalysis.per_serving.carbs_g * recipeAnalysis.servings / recipeServings * 10) / 10,
    fat_g: editedIngredients.length > 0
      ? Math.round(editedIngredients.reduce((s, i) => s + i.fat_g, 0) / recipeServings * 10) / 10
      : Math.round(recipeAnalysis.per_serving.fat_g * recipeAnalysis.servings / recipeServings * 10) / 10,
    fiber_g: recipeAnalysis.per_serving.fiber_g != null
      ? Math.round(recipeAnalysis.per_serving.fiber_g * recipeAnalysis.servings / recipeServings * 10) / 10
      : null,
  } : null

  const activePerServing = macroOverride
    ? { ...computedPerServing!, ...macroOverride, fiber_g: computedPerServing?.fiber_g ?? null }
    : computedPerServing

  const handleRecipeConfirm = async () => {
    if (!recipeAnalysis || !activePerServing) return
    setSaving(true)
    try {
      const servingWeight = displayServingWeight || Math.round(recipeAnalysis.total_weight_g / recipeServings)
      const per100 = (val: number) => servingWeight > 0 ? Math.round(val / servingWeight * 100 * 10) / 10 : 0
      const id = await createCustomFood({
        name: recipeDishName.trim() || recipeAnalysis.dish_name,
        calories_per_100g: per100(activePerServing.kcal),
        protein_per_100g: per100(activePerServing.protein_g),
        carbs_per_100g: per100(activePerServing.carbs_g),
        fat_per_100g: per100(activePerServing.fat_g),
        fiber_per_100g: activePerServing.fiber_g != null ? per100(activePerServing.fiber_g) : null,
      })
      setSelected({
        id,
        name: recipeDishName.trim() || recipeAnalysis.dish_name,
        brand: null,
        calories_per_100g: per100(activePerServing.kcal),
        protein_per_100g: per100(activePerServing.protein_g),
        carbs_per_100g: per100(activePerServing.carbs_g),
        fat_per_100g: per100(activePerServing.fat_g),
        fiber_per_100g: activePerServing.fiber_g != null ? per100(activePerServing.fiber_g) : null,
        source: 'custom',
      })
      setQty(String(servingWeight))
      setStep('quantity')
    } catch {
      // keep form open
    } finally {
      setSaving(false)
    }
  }

  const updateIngQty = (id: string, newQty: number) => {
    setEditedIngredients(prev => prev.map(ing => {
      if (ing._id !== id) return ing
      const ratio = ing.quantity_g > 0 ? newQty / ing.quantity_g : 0
      return {
        ...ing,
        quantity_g: newQty,
        kcal: Math.round(ing.kcal * ratio * 10) / 10,
        protein_g: Math.round(ing.protein_g * ratio * 10) / 10,
        carbs_g: Math.round(ing.carbs_g * ratio * 10) / 10,
        fat_g: Math.round(ing.fat_g * ratio * 10) / 10,
      }
    }))
    setMacroOverride(null)
  }

  const updateIngName = (id: string, name: string) =>
    setEditedIngredients(prev => prev.map(ing => ing._id === id ? { ...ing, name } : ing))

  const deleteIng = (id: string) => {
    setEditedIngredients(prev => prev.filter(i => i._id !== id))
    setMacroOverride(null)
  }

  const confirmAddIng = () => {
    if (!newIngName.trim()) return
    setEditedIngredients(prev => [...prev, {
      _id: `new-${Date.now()}`,
      name: newIngName.trim(),
      quantity_g: parseFloat(newIngQty) || 0,
      kcal: parseFloat(newIngKcal) || 0,
      protein_g: parseFloat(newIngProt) || 0,
      carbs_g: parseFloat(newIngCarbs) || 0,
      fat_g: parseFloat(newIngFat) || 0,
    }])
    setNewIngName(''); setNewIngQty(''); setNewIngKcal(''); setNewIngProt(''); setNewIngCarbs(''); setNewIngFat('')
    setAddingIngredient(false)
    setMacroOverride(null)
  }

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
        date: entryDate,
        ...calcMacros(selected, qtyNum),
      })
      router.push(entryDate === today ? '/' : `/journal?date=${entryDate}`)
      router.refresh()
    } catch {
      setSaving(false)
    }
  }

  const macros = selected && qty ? calcMacros(selected, parseFloat(qty) || 0) : null

  // ── Step: create custom food ──────────────────────────────────────────────
  if (step === 'create') {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#E8E2D6' }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => setStep('search')} className="p-1">
            <ArrowLeft size={22} color="#0F0F0F" />
          </button>
          <span className="font-semibold text-lg" style={{ color: '#0F0F0F' }}>Créer un aliment</span>
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
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B6457' }}>{label}</label>
              <input
                type={type}
                inputMode={type === 'number' ? 'decimal' : undefined}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="rounded-xl px-4 py-3 text-base outline-none"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC', color: '#0F0F0F' }}
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
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#E8E2D6' }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => setStep('search')} className="p-1">
            <ArrowLeft size={22} color="#0F0F0F" />
          </button>
          <span className="font-semibold text-lg truncate" style={{ color: '#0F0F0F' }}>{selected.name}</span>
        </div>
        {dateLabel && <DateBadge label={dateLabel} />}

        <div className="flex flex-col gap-4 px-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
            <p className="font-semibold" style={{ color: '#0F0F0F' }}>{selected.name}</p>
            {selected.brand && <p className="text-sm mt-0.5" style={{ color: '#6B6457' }}>{selected.brand}</p>}
            <p className="text-xs mt-2" style={{ color: '#6B6457' }}>
              Pour 100g : {selected.calories_per_100g} kcal · {selected.protein_per_100g}g P · {selected.carbs_per_100g}g G · {selected.fat_per_100g}g L{selected.fiber_per_100g != null ? ` · ${selected.fiber_per_100g}g F` : ''}
            </p>
          </div>

          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
            <label className="text-sm font-medium" style={{ color: '#6B6457' }}>Quantité (grammes)</label>
            <input
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              autoFocus
              className="text-4xl font-bold text-center w-full bg-transparent outline-none tabular-nums"
              style={{ color: '#0F0F0F' }}
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
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold tabular-nums" style={{ color: '#FF6B2B' }}>{macros.calories} kcal</span>
                <div className="flex gap-3 text-sm tabular-nums flex-wrap">
                  <span style={{ color: '#FF6B2B' }}>{macros.protein_g}g P</span>
                  <span style={{ color: '#3B82F6' }}>{macros.carbs_g}g G</span>
                  <span style={{ color: '#D97706' }}>{macros.fat_g}g L</span>
                  {macros.fiber_g != null && <span style={{ color: '#10B981' }}>{macros.fiber_g}g F</span>}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
            <span className="text-sm font-medium" style={{ color: '#6B6457' }}>Repas</span>
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

  // ── Step: describe dish ────────────────────────────────────────────────
  if (step === 'describe') {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#E8E2D6' }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => setStep('search')} className="p-1">
            <ArrowLeft size={22} color="#0F0F0F" />
          </button>
          <span className="font-semibold text-lg" style={{ color: '#0F0F0F' }}>Décrire un plat</span>
        </div>

        <div className="flex flex-col gap-4 px-4">
          <p className="text-sm" style={{ color: '#6B6457' }}>
            Décris ton plat en une phrase et Claude estimera les ingrédients et les macros.
          </p>
          <textarea
            value={describeText}
            onChange={(e) => setDescribeText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleDescribeDish() }}
            placeholder="Ex: poulet rôti avec riz basmati et brocolis vapeur, pour 2 personnes"
            rows={4}
            autoFocus
            className="rounded-xl px-4 py-3 text-base outline-none resize-none"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC', color: '#0F0F0F' }}
          />
          <button
            onClick={handleDescribeDish}
            disabled={!describeText.trim()}
            className="w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
          >
            <MessageSquare size={20} />
            Estimer les macros
          </button>
        </div>
      </div>
    )
  }

  // ── Step: recipe scan ────────────────────────────────────────────────
  if (step === 'recipe') {
    return (
      <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#E8E2D6' }}>
        <div className="flex items-center gap-3 px-4 pt-5 pb-4">
          <button onClick={() => { setStep('search'); setRecipeAnalysis(null); setRecipeError(null) }} className="p-1">
            <ArrowLeft size={22} color="#0F0F0F" />
          </button>
          <span className="font-semibold text-lg" style={{ color: '#0F0F0F' }}>Analyser une recette</span>
        </div>

        {recipeAnalyzing && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4">
            <Loader2 size={36} color="#FF6B2B" className="animate-spin" />
            <p className="text-sm text-center" style={{ color: '#6B6457' }}>Analyse en cours…<br />Ça prend quelques secondes.</p>
          </div>
        )}

        {recipeError && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4">
            <p className="text-sm text-center" style={{ color: '#6B6457' }}>{recipeError}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-medium"
              style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
            >
              <Camera size={18} /> Réessayer
            </button>
          </div>
        )}

        {!recipeAnalyzing && !recipeError && recipeAnalysis && activePerServing && (
          <div className="flex flex-col gap-4 px-4 pb-6">
            {/* Dish name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B6457' }}>Nom du plat</label>
              <input
                type="text"
                value={recipeDishName}
                onChange={(e) => setRecipeDishName(e.target.value)}
                className="rounded-xl px-4 py-3 text-base outline-none font-medium"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC', color: '#0F0F0F' }}
              />
            </div>

            {/* Servings */}
            <div className="rounded-2xl px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
              <span className="text-sm font-medium" style={{ color: '#0F0F0F' }}>Nombre de portions</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setRecipeServings((s) => Math.max(1, s - 1)); setMacroOverride(null) }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ backgroundColor: '#F0EBE3', color: '#0F0F0F' }}
                >−</button>
                <span className="w-6 text-center font-semibold tabular-nums" style={{ color: '#0F0F0F' }}>{recipeServings}</span>
                <button
                  onClick={() => { setRecipeServings((s) => s + 1); setMacroOverride(null) }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ backgroundColor: '#F0EBE3', color: '#0F0F0F' }}
                >+</button>
              </div>
            </div>

            {/* Macros per serving — editable */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#6B6457' }}>
                Par portion · {displayServingWeight}g
              </p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={activePerServing.kcal}
                  onChange={(e) => setMacroOverride(prev => ({ ...(prev ?? computedPerServing!), kcal: parseFloat(e.target.value) || 0 }))}
                  className="w-20 text-xl font-bold text-center rounded-lg px-2 py-1.5 outline-none tabular-nums"
                  style={{ backgroundColor: '#FFF1E8', color: '#FF6B2B', border: '1px solid #FFD4BB' }}
                />
                <span className="text-sm font-medium" style={{ color: '#FF6B2B' }}>kcal</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'protein_g', label: 'P', color: '#FF6B2B' },
                  { key: 'carbs_g', label: 'G', color: '#3B82F6' },
                  { key: 'fat_g', label: 'L', color: '#D97706' },
                ] as const).map(({ key, label, color }) => (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={activePerServing[key]}
                      onChange={(e) => setMacroOverride(prev => ({ ...(prev ?? computedPerServing!), [key]: parseFloat(e.target.value) || 0 }))}
                      className="w-full text-center rounded-lg px-2 py-1.5 text-sm font-semibold outline-none tabular-nums"
                      style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}40` }}
                    />
                    <span className="text-xs" style={{ color: '#6B6457' }}>g {label}</span>
                  </div>
                ))}
              </div>
              {macroOverride && (
                <button
                  onClick={() => setMacroOverride(null)}
                  className="mt-2 text-xs underline"
                  style={{ color: '#9B9287' }}
                >
                  Réinitialiser depuis les ingrédients
                </button>
              )}
            </div>

            {/* Ingredients list — editable */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
              <p className="text-xs font-semibold uppercase tracking-wide px-4 pt-3 pb-2" style={{ color: '#6B6457' }}>Ingrédients</p>
              {editedIngredients.map((ing) => (
                <div key={ing._id} className="flex items-center gap-2 px-3 py-2" style={{ borderTop: '1px solid #F0EBE3' }}>
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngName(ing._id, e.target.value)}
                    className="flex-1 min-w-0 text-sm rounded-lg px-2 py-1 outline-none"
                    style={{ backgroundColor: '#F8F6F2', color: '#0F0F0F', border: '1px solid #DDD7CC' }}
                  />
                  <input
                    type="number"
                    inputMode="decimal"
                    value={ing.quantity_g}
                    onChange={(e) => updateIngQty(ing._id, parseFloat(e.target.value) || 0)}
                    className="w-16 text-sm text-center rounded-lg px-2 py-1 outline-none tabular-nums"
                    style={{ backgroundColor: '#F8F6F2', color: '#6B6457', border: '1px solid #DDD7CC' }}
                  />
                  <span className="text-xs shrink-0" style={{ color: '#9B9287' }}>g</span>
                  <button onClick={() => deleteIng(ing._id)} className="shrink-0 p-1 rounded-full" style={{ color: '#9B9287' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}

              {addingIngredient ? (
                <div className="flex flex-col gap-2 px-3 py-3" style={{ borderTop: '1px solid #F0EBE3' }}>
                  <input
                    type="text"
                    value={newIngName}
                    onChange={(e) => setNewIngName(e.target.value)}
                    placeholder="Nom de l'ingrédient"
                    autoFocus
                    className="w-full text-sm rounded-lg px-2 py-1.5 outline-none"
                    style={{ backgroundColor: '#F8F6F2', color: '#0F0F0F', border: '1px solid #DDD7CC' }}
                  />
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { val: newIngQty, set: setNewIngQty, label: 'g' },
                      { val: newIngKcal, set: setNewIngKcal, label: 'kcal' },
                      { val: newIngProt, set: setNewIngProt, label: 'P' },
                      { val: newIngCarbs, set: setNewIngCarbs, label: 'G' },
                      { val: newIngFat, set: setNewIngFat, label: 'L' },
                    ].map(({ val, set, label }) => (
                      <div key={label} className="flex flex-col items-center gap-0.5">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          placeholder="0"
                          className="w-full text-xs text-center rounded-lg px-1 py-1.5 outline-none"
                          style={{ backgroundColor: '#F8F6F2', color: '#0F0F0F', border: '1px solid #DDD7CC' }}
                        />
                        <span className="text-[10px]" style={{ color: '#9B9287' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAddingIngredient(false)}
                      className="flex-1 py-2 rounded-xl text-sm font-medium"
                      style={{ backgroundColor: '#F0EBE3', color: '#6B6457' }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={confirmAddIng}
                      disabled={!newIngName.trim()}
                      className="flex-1 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingIngredient(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-medium"
                  style={{ borderTop: '1px solid #F0EBE3', color: '#FF6B2B' }}
                >
                  <Plus size={15} /> Ajouter un ingrédient
                </button>
              )}
            </div>

            <p className="text-xs text-center px-2" style={{ color: '#9B9287' }}>
              Valeurs estimées par IA — ajuste si nécessaire
            </p>

            <button
              onClick={handleRecipeConfirm}
              disabled={saving}
              className="w-full py-4 rounded-2xl font-bold text-lg disabled:opacity-50"
              style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
            >
              {saving ? 'Enregistrement…' : 'Créer et ajouter au journal'}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRecipeFile(f) }}
        />
      </div>
    )
  }

  // ── Step: search ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#E8E2D6' }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <button onClick={() => router.back()} className="p-1">
          <ArrowLeft size={22} color="#0F0F0F" />
        </button>
        <span className="font-semibold text-lg flex-1" style={{ color: '#0F0F0F' }}>Ajouter un aliment</span>
        <button
          onClick={() => { setDescribeText(''); setRecipeAnalysis(null); setRecipeError(null); setStep('describe') }}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#F0EBE3' }}
          aria-label="Décrire un plat"
        >
          <MessageSquare size={16} color="#FF6B2B" />
        </button>
        <button
          onClick={() => {
            setRecipeAnalysis(null); setRecipeError(null)
            fileInputRef.current?.click()
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#F0EBE3' }}
          aria-label="Scanner une recette"
        >
          <Camera size={16} color="#FF6B2B" />
        </button>
        <button
          onClick={handleOpenCreate}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#FF6B2B' }}
          aria-label="Créer un aliment personnalisé"
        >
          <Plus size={18} color="#FFFFFF" />
        </button>
      </div>
      {dateLabel && <DateBadge label={dateLabel} />}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRecipeFile(f) }}
      />

      <div className="px-4 pb-3">
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
          <Search size={18} color="#6B6457" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Rechercher un aliment…"
            className="flex-1 bg-transparent outline-none text-base"
            style={{ color: '#0F0F0F' }}
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
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate" style={{ color: '#0F0F0F' }}>{food.name}</span>
                <SourceBadge source={food.source} customLabel={food.customLabel} />
                {food.isFavorite && <Star size={12} fill="#EAB308" color="#EAB308" className="shrink-0" />}
              </div>
              {food.brand && <span className="text-xs" style={{ color: '#6B6457' }}>{food.brand}</span>}
              <span className="text-xs tabular-nums" style={{ color: '#6B6457' }}>
                {food.calories_per_100g} kcal · {food.protein_per_100g}g P · {food.carbs_per_100g}g G · {food.fat_per_100g}g L{food.fiber_per_100g != null ? ` · ${food.fiber_per_100g}g F` : ''}
              </span>
            </div>
            <ChevronRight size={18} color="#6B6457" className="shrink-0 ml-2" />
          </button>
        ))}

        {/* Sentinel pour le scroll infini */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            <div className="w-5 h-5 rounded-full border-2 animate-spin"
              style={{ borderColor: '#DDD7CC', borderTopColor: '#A0A0A0' }} />
          </div>
        )}

        {query.length >= 2 && !loading && allResults.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-10">
            <p style={{ color: '#6B6457' }}>Aucun résultat pour « {query} »</p>
            <button onClick={handleOpenCreate}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-medium"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #FF6B2B', color: '#FF6B2B' }}>
              <Plus size={18} />
              Créer cet aliment
            </button>
          </div>
        )}

        {query.length >= 2 && !loading && allResults.length > 0 && !hasMore && (
          <button onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium mt-1"
            style={{ backgroundColor: 'transparent', border: '1px dashed #2E2E2E', color: '#6B6457' }}>
            <Plus size={15} />
            Créer un aliment personnalisé
          </button>
        )}

        {query.length === 0 && favorites.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 px-1 pb-1">
              <Star size={13} fill="#EAB308" color="#EAB308" />
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6B6457' }}>Favoris</span>
            </div>
            {favorites.map((food) => (
              <button key={food.id} onClick={() => handleSelect(food)}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-left active:opacity-70"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate" style={{ color: '#0F0F0F' }}>{food.name}</span>
                    <SourceBadge source={food.source} customLabel={food.customLabel} />
                  </div>
                  {food.brand && <span className="text-xs" style={{ color: '#6B6457' }}>{food.brand}</span>}
                  <span className="text-xs tabular-nums" style={{ color: '#6B6457' }}>
                    {food.calories_per_100g} kcal · {food.protein_per_100g}g P · {food.carbs_per_100g}g G · {food.fat_per_100g}g L{food.fiber_per_100g != null ? ` · ${food.fiber_per_100g}g F` : ''}
                  </span>
                </div>
                <ChevronRight size={18} color="#6B6457" className="shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}

        {query.length === 0 && favorites.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-12">
            <p className="text-sm" style={{ color: '#6B6457' }}>Tape le nom d&apos;un aliment pour commencer</p>
            <button
              onClick={() => { setRecipeAnalysis(null); setRecipeError(null); fileInputRef.current?.click() }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-medium"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC', color: '#6B6457' }}
            >
              <ChefHat size={16} color="#FF6B2B" />
              Scanner une recette
            </button>
            <button
              onClick={() => { setDescribeText(''); setRecipeAnalysis(null); setRecipeError(null); setStep('describe') }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-medium"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC', color: '#6B6457' }}
            >
              <MessageSquare size={16} color="#FF6B2B" />
              Décrire un plat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
