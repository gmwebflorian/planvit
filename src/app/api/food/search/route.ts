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
  fiber_per_100g: number | null
  source: 'off' | 'ciqual' | 'custom'
  customLabel?: string
  isFavorite?: boolean
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


async function searchCustomFoods(query: string): Promise<FoodSearchResult[]> {
  const supabase = await createServerClient()
  // Require authentication — but search ALL users' custom foods
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const singular = query.length > 3 && query.endsWith('s') ? query.slice(0, -1) : null

  const select = 'id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, creator_name'
  const queries = [
    supabase.from('custom_foods').select(select).ilike('name', `%${query}%`).limit(20),
    ...(singular
      ? [supabase.from('custom_foods').select(select).ilike('name', `%${singular}%`).limit(20)]
      : []),
  ]

  const results = await Promise.all(queries)
  const seen = new Set<string>()
  const data = []
  for (const res of results) {
    for (const f of res.data ?? []) {
      if (!seen.has(f.id)) { seen.add(f.id); data.push(f) }
    }
  }

  return data.map((f) => ({
    id: f.id,
    name: f.name,
    brand: null,
    calories_per_100g: f.calories_per_100g,
    protein_per_100g: f.protein_per_100g,
    carbs_per_100g: f.carbs_per_100g,
    fat_per_100g: f.fat_per_100g,
    fiber_per_100g: f.fiber_per_100g ?? null,
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
      .select('id, name, kcal, protein_g, carbs_g, fat_g, fiber_g')
      .textSearch('name', query, { type: 'plain', config: 'french' })
      .limit(80),
    supabase
      .from('reference_foods')
      .select('id, name, kcal, protein_g, carbs_g, fat_g, fiber_g')
      .ilike('name', `%${query}%`)
      .limit(80),
    ...(singular
      ? [supabase
          .from('reference_foods')
          .select('id, name, kcal, protein_g, carbs_g, fat_g, fiber_g')
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
    fiber_per_100g: f.fiber_g ?? null,
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
        fiber_per_100g: n['fiber_100g'] != null ? Math.round(n['fiber_100g'] * 10) / 10 : null,
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

  const [customResults, ciqualResults, offResults] = await Promise.allSettled([
    searchCustomFoods(query),
    searchCiqual(query),
    searchOpenFoodFacts(query),
  ])

  const custom = customResults.status === 'fulfilled' ? customResults.value : []
  const ciqual = ciqualResults.status === 'fulfilled' ? ciqualResults.value : []
  const off    = offResults.status    === 'fulfilled' ? offResults.value    : []

  // Custom foods first, then Ciqual/OFF deduplicated and ranked
  const seen = new Set<string>()
  const merged: FoodSearchResult[] = []

  for (const item of custom) {
    seen.add(norm(item.name).slice(0, 40))
    merged.push(item)
  }

  const rest: FoodSearchResult[] = []
  for (const item of [...ciqual, ...off]) {
    const key = norm(item.name).slice(0, 40)
    if (!seen.has(key)) { seen.add(key); rest.push(item) }
  }
  rest.sort((a, b) => relevanceScore(b.name, query) - relevanceScore(a.name, query))

  return NextResponse.json({ results: [...merged, ...rest] })
}
