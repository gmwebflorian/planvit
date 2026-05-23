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
  source: 'off' | 'usda' | 'ciqual'
}

async function searchCiqual(query: string): Promise<FoodSearchResult[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('reference_foods')
    .select('id, name, kcal, protein_g, carbs_g, fat_g')
    .ilike('name', `%${query}%`)
    .limit(8)

  if (!data) return []
  return data.map((f) => ({
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
  url.searchParams.set('page_size', '15')
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
    .slice(0, 10)
}

async function searchUSDA(query: string): Promise<FoodSearchResult[]> {
  const apiKey = process.env.USDA_API_KEY ?? 'DEMO_KEY'
  const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search')
  url.searchParams.set('query', query)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('dataType', 'Foundation,SR Legacy')
  url.searchParams.set('pageSize', '10')

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
  if (!res.ok) return []

  const data = await res.json()

  return (data.foods ?? [])
    .map((f: Record<string, unknown>) => {
      const nutrients = (f.foodNutrients as Array<{ nutrientId: number; value: number }>) ?? []
      const get = (id: number) => nutrients.find((n) => n.nutrientId === id)?.value ?? 0

      const kcal = Math.round(get(1008))
      if (kcal === 0) return null

      return {
        id: `usda_${f.fdcId}`,
        name: String(f.description),
        brand: null,
        calories_per_100g: kcal,
        protein_per_100g: Math.round(get(1003) * 10) / 10,
        carbs_per_100g: Math.round(get(1005) * 10) / 10,
        fat_per_100g: Math.round(get(1004) * 10) / 10,
        source: 'usda' as const,
      }
    })
    .filter(Boolean) as FoodSearchResult[]
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const [ciqualResults, offResults, usdaResults] = await Promise.allSettled([
    searchCiqual(query),
    searchOpenFoodFacts(query),
    searchUSDA(query),
  ])

  const ciqual = ciqualResults.status === 'fulfilled' ? ciqualResults.value : []
  const off = offResults.status === 'fulfilled' ? offResults.value : []
  const usda = usdaResults.status === 'fulfilled' ? usdaResults.value : []

  // Ciqual en premier (aliments génériques FR), puis OFF (produits de marque), puis USDA
  const seen = new Set<string>()
  const merged: FoodSearchResult[] = []

  for (const item of [...ciqual, ...off, ...usda]) {
    const key = item.name.toLowerCase().slice(0, 30)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  }

  return NextResponse.json({ results: merged.slice(0, 20) })
}
