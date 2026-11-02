import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export interface RecipeIngredient {
  name: string
  quantity_g: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface RecipeAnalysis {
  dish_name: string
  servings: number
  total_weight_g: number
  serving_weight_g: number
  ingredients: RecipeIngredient[]
  per_serving: {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number | null
  }
  per_100g: {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number | null
  }
}

const PROMPT = `Tu es un nutritionniste expert. Analyse cette image — cela peut être une photo de plat cuisiné, une capture d'écran de recette (Instagram, blog, application), ou une liste d'ingrédients sous forme de texte. Retourne UNIQUEMENT un objet JSON valide (sans markdown, sans texte autour).

Structure attendue :
{
  "dish_name": "nom du plat",
  "servings": 2,
  "total_weight_g": 600,
  "ingredients": [
    {
      "name": "nom ingrédient",
      "quantity_g": 200,
      "kcal": 160,
      "protein_g": 10.5,
      "carbs_g": 20.0,
      "fat_g": 3.5
    }
  ],
  "per_serving": {
    "kcal": 350,
    "protein_g": 28.0,
    "carbs_g": 35.0,
    "fat_g": 8.0,
    "fiber_g": 2.5
  }
}

Règles :
- Si l'image contient du texte (capture d'écran), lis les ingrédients directement dans le texte — ignore les emojis et les doublons (ex: version française ET anglaise de la même liste : utilise une seule fois)
- Convertis toutes les unités en grammes (1 càc ≈ 5g, 1 càs ≈ 15g, 1 tasse ≈ 240ml, 1 verre ≈ 200ml, 1 boîte de lardons ≈ 150g, 1 oignon ≈ 150g, 1 gousse d'ail ≈ 5g)
- Pour les ingrédients sans quantité précisée (ex: "Gnocchi", "Parmesan", "Persil"), estime une quantité typique en grammes
- total_weight_g = somme des quantités de tous les ingrédients
- Les macros des ingrédients sont les totaux pour la quantité indiquée (pas pour 100g)
- per_serving = total recette / nombre de portions
- Lis le nombre de portions dans le texte si précisé (ex: "2 personnes" → servings: 2), sinon estime 4
- Arrondis les macros à 1 décimale
- fiber_g : estime ou mets null
- Si une information est incertaine, estime raisonnablement
- Ne réponds JAMAIS avec autre chose que le JSON brut, même si l'image est floue ou incomplète : estime toujours`

function extractJSON(raw: string): unknown {
  // Strip markdown code fences
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '')
  // Find outermost JSON object
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('no JSON')
  // Remove trailing commas before } or ]
  const clean = match[0].replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(clean)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { image: string; mediaType: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { image, mediaType } = body
  if (!image || !mediaType) {
    return NextResponse.json({ error: 'missing_image' }, { status: 400 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let raw: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp', data: image },
            },
            { type: 'text', text: PROMPT },
          ],
        },
        // Prefill forces the model to continue directly with JSON, no preamble
        { role: 'assistant', content: '{' },
      ],
    })
    const partial = message.content[0].type === 'text' ? message.content[0].text : ''
    raw = '{' + partial
  } catch (err) {
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'ai_error' }, { status: 502 })
  }

  let parsed: Omit<RecipeAnalysis, 'serving_weight_g' | 'per_100g'>
  try {
    parsed = extractJSON(raw) as Omit<RecipeAnalysis, 'serving_weight_g' | 'per_100g'>
  } catch {
    return NextResponse.json({ error: 'parse_failed', raw }, { status: 422 })
  }

  const serving_weight_g = parsed.total_weight_g / parsed.servings
  const per_100g = {
    kcal: Math.round(parsed.per_serving.kcal / serving_weight_g * 100 * 10) / 10,
    protein_g: Math.round(parsed.per_serving.protein_g / serving_weight_g * 100 * 10) / 10,
    carbs_g: Math.round(parsed.per_serving.carbs_g / serving_weight_g * 100 * 10) / 10,
    fat_g: Math.round(parsed.per_serving.fat_g / serving_weight_g * 100 * 10) / 10,
    fiber_g: parsed.per_serving.fiber_g != null
      ? Math.round(parsed.per_serving.fiber_g / serving_weight_g * 100 * 10) / 10
      : null,
  }

  const analysis: RecipeAnalysis = { ...parsed, serving_weight_g: Math.round(serving_weight_g), per_100g }
  return NextResponse.json(analysis)
}
