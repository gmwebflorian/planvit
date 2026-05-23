import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export interface FoodSearchResult {
  id: string
  name: string
  brand: string | null
  calories_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  source: 'off' | 'ciqual'
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

  if (n === q) return 1000

  // Starts with query followed by separator (e.g. "oeuf, dur")
  if (n.startsWith(q + ',') || n.startsWith(q + ' ') || n.startsWith(q + '(')) return 700

  // Starts with query
  if (n.startsWith(q)) return 600

  // First word is an exact match
  const words = n.split(/[\s,();\/\-]+/)
  if (words[0] === q) return 500

  // Any whole word is an exact match
  if (words.some((w) => w === q)) return 400

  // Any word starts with query
  if (words.some((w) => w.startsWith(q))) return 300

  // Contains query anywhere
  if (n.includes(q)) return 200

  // FTS match with no direct string hit — penalize longer names slightly
  return Math.max(1, 100 - Math.floor(name.length / 5))
}

async function searchCiqual(query: string): Promise<FoodSearchResult[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [ftRes, ilikeRes] = await Promise.all([
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
  ])

  const seen = new Set<number>()
  const merged = []
  for (const f of [...(ftRes.data ?? []), ...(ilikeRes.data ?? [])]) {
    if (!seen.has(f.id)) {
      seen.add(f.id)
      merged.push(f)
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

  const [ciqualResults, offResults] = await Promise.allSettled([
    searchCiqual(query),
    searchOpenFoodFacts(query),
  ])

  const ciqual = ciqualResults.status === 'fulfilled' ? ciqualResults.value : []
  const off = offResults.status === 'fulfilled' ? offResults.value : []

  // Deduplicate by normalized name (first 40 chars)
  const seen = new Set<string>()
  const merged: FoodSearchResult[] = []
  for (const item of [...ciqual, ...off]) {
    const key = norm(item.name).slice(0, 40)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  }

  // Sort by relevance — the full sorted list is returned; the client paginates locally
  merged.sort((a, b) => {
    const diff = relevanceScore(b.name, query) - relevanceScore(a.name, query)
    if (diff !== 0) return diff
    return a.name.length - b.name.length  // tiebreak: shorter name first
  })

  return NextResponse.json({ results: merged })
}
