import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export interface FoodSearchResult {
  id: string
  name: string
  brand: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  source: 'off' | 'ciqual' | 'custom'
  customLabel?: string
}

// Normalize accents/ligatures for comparison
function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, "'")
}

function relevanceScore(name: string, query: string): number {
  const n = norm(name)
  const q = norm(query)
  const qSingular = q.length > 3 && q.endsWith('s') ? q.slice(0, -1) : q

  const matchesExact   = n === q || n === qSingular
  const matchesStart   = n.startsWith(q + ',') || n.startsWith(q + ' ') || n.startsWith(q + '(')
                      || n.startsWith(qSingular + ',') || n.startsWith(qSingular + ' ') || n.startsWith(qSingular + '(')
  const matchesPrefix  = n.startsWith(q) || n.startsWith(qSingular)
  const words          = n.split(/[\s,();\/\-]+/)
  const firstWordExact = words[0] === q || words[0] === qSingular
  const anyWordExact   = words.some((w) => w === q || w === qSingular)
  const anyWordPrefix  = words.some((w) => w.startsWith(q) || w.startsWith(qSingular))
  const contains       = n.includes(q) || n.includes(qSingular)

  let tier: number
  if (matchesExact)     tier = 7
  else if (matchesStart)   tier = 6
  else if (matchesPrefix)  tier = 5
  else if (firstWordExact) tier = 4
  else if (anyWordExact)   tier = 3
  else if (anyWordPrefix)  tier = 2
  else if (contains)       tier = 1
  else                     tier = 0

  // Within each tier, shorter names rank higher
  return tier * 10000 - name.length
}

async function searchFavorites(query: string): Promise<FoodSearchResult[]> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const singular = query.length > 3 && query.endsWith('s') ? query.slice(0, -1) : null
  const orFilter = singular
    ? `food_name.ilike.%${query}%,food_name.ilike.%${singular}%`
    : `food_name.ilike.%${query}%`

  const { data } = await supabase
    .from('favorites')
    .select('food_name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, brand, source, custom_label')
    .eq('user_id', user.id)
    .or(orFilter)
    .order('created_at', { ascending: false })

  return (data ?? []).map((f) => ({
    id: `fav_${f.food_name}`,
    name: f.food_name,
    brand: f.brand ?? null,
    calories_per_100g: f.calories_per_100g,
    protein_per_100g:  f.protein_per_100g,
    carbs_per_100g:    f.carbs_per_100g,
    fat_per_100g:      f.fat_per_100g,
    source: (f.source as 'ciqual' | 'off' | 'custom') ?? 'ciqual',
    customLabel: f.custom_label ?? undefined,
  }))
}

async function searchCustomFoods(query: string): Promise<FoodSearchResult[]> {
  const supabase = await createServerClient()
  // Require authentication — but search ALL users' custom foods
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const singular = query.length > 3 && query.endsWith('s') ? query.slice(0, -1) : null
  const orFilter = singular
    ? `name.ilike.%${query}%,name.ilike.%${singular}%`
    : `name.ilike.%${query}%`

  const { data } = await supabase
    .from('custom_foods')
    .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, creator_name')
    .or(orFilter)
    .limit(20)

  return (data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    brand: null,
    calories_per_100g: f.calories_per_100g,
    protein_per_100g: f.protein_per_100g,
    carbs_per_100g: f.carbs_per_100g,
    fat_per_100g: f.fat_per_100g,
    source: 'custom' as const,
    customLabel: f.creator_name ?? 'Utilisateur',
  }))
}

async function searchCiqual(query: string): Promise<FoodSearchResult[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const singular = query.length > 3 && query.endsWith('s') ? query.slice(0, -1) : null

  const queries = [
    supabase
      .from('reference_foods')
      .select('id, name, kcal, protein_g, carbs_g, fat_g')
      .textSearch('name', query, { type: 'plain', config: 'french' })
      .limit(80),
    supabase
      .from('reference_foods')
      .select('id, name, kcal, protein_g, carbs_g, fat_g')
      .ilike('name', `%${query}%`)
      .limit(80),
    ...(singular
      ? [supabase
          .from('reference_foods')
          .select('id, name, kcal, protein_g, carbs_g, fat_g')
          .ilike('name', `%${singular}%`)
          .limit(80)]
      : []),
  ]

  const results = await Promise.all(queries)

  const seen = new Set<number>()
  const merged = []
  for (const res of results) {
    for (const f of res.data ?? []) {
      if (!seen.has(f.id)) {
        seen.add(f.id)
        merged.push(f)
      }
    }
  }

  return merged.map((f) => ({
    id: `ciqual_${f.id}`,
    name: f.name,
    brand: null,
    calories_per_100g: f.kcal,
    protein_per_100g: f.protein_g,
    carbs_per_100g: f.carbs_g,
    fat_per_100g: f.fat_g,
    source: 'ciqual' as const,
  }))
}

async function searchOpenFoodFacts(query: string): Promise<FoodSearchResult[]> {
  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl')
  url.searchParams.set('search_terms', query)
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '20')
  url.searchParams.set('fields', 'id,product_name,brands,nutriments')
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'PlanVIT/1.0 (contact@planvit.app)' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []

  const data = await res.json()
  return (data.products ?? [])
    .filter((p: Record<string, unknown>) => {
      const n = p.nutriments as Record<string, number> | undefined
      return p.product_name && n && (n['energy-kcal_100g'] ?? 0) > 0
    })
    .map((p: Record<string, unknown>) => {
      const n = p.nutriments as Record<string, number>
      return {
        id: `off_${String(p.id ?? p.code ?? Math.random())}`,
        name: String(p.product_name),
        brand: p.brands ? String(p.brands).split(',')[0].trim() : null,
        calories_per_100g: Math.round(n['energy-kcal_100g'] ?? 0),
        protein_per_100g: Math.round((n['proteins_100g'] ?? 0) * 10) / 10,
        carbs_per_100g: Math.round((n['carbohydrates_100g'] ?? 0) * 10) / 10,
        fat_per_100g: Math.round((n['fat_100g'] ?? 0) * 10) / 10,
        source: 'off' as const,
      }
    })
    .slice(0, 20)
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const [favResults, customResults, ciqualResults, offResults] = await Promise.allSettled([
    searchFavorites(query),
    searchCustomFoods(query),
    searchCiqual(query),
    searchOpenFoodFacts(query),
  ])

  const favs   = favResults.status    === 'fulfilled' ? favResults.value    : []
  const custom = customResults.status === 'fulfilled' ? customResults.value : []
  const ciqual = ciqualResults.status === 'fulfilled' ? ciqualResults.value : []
  const off    = offResults.status    === 'fulfilled' ? offResults.value    : []

  // Priority: favorites → custom → ciqual/OFF (deduplicated by name)
  const seen = new Set<string>()
  const pinned: FoodSearchResult[] = []

  for (const item of favs) {
    seen.add(norm(item.name).slice(0, 40))
    pinned.push(item)
  }

  const customUnique: FoodSearchResult[] = []
  for (const item of custom) {
    const key = norm(item.name).slice(0, 40)
    if (!seen.has(key)) { seen.add(key); customUnique.push(item) }
  }

  const rest: FoodSearchResult[] = []
  for (const item of [...ciqual, ...off]) {
    const key = norm(item.name).slice(0, 40)
    if (!seen.has(key)) { seen.add(key); rest.push(item) }
  }

  rest.sort((a, b) => relevanceScore(b.name, query) - relevanceScore(a.name, query))

  return NextResponse.json({ results: [...pinned, ...customUnique, ...rest] })
}
