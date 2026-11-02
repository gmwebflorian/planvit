import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { RecipeAnalysis } from '../analyze-recipe/route'

const PROMPT = `Tu es un nutritionniste expert. À partir de la description d'un plat maison, estime les ingrédients typiques avec leurs quantités et calcule les macronutriments. Retourne UNIQUEMENT un objet JSON valide (sans markdown, sans texte autour).

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
- Estime des quantités typiques pour chaque ingrédient mentionné ou impliqué par la recette
- Si le nombre de portions n'est pas précisé, estime 2 portions
- total_weight_g = somme des quantités de tous les ingrédients
- Les macros des ingrédients sont les totaux pour la quantité indiquée (pas pour 100g)
- per_serving = total recette / nombre de portions
- Arrondis les macros à 1 décimale
- fiber_g : estime ou mets null
- Ne réponds JAMAIS avec autre chose que le JSON brut`

function extractJSON(raw: string): unknown {
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '')
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('no JSON')
  const clean = match[0].replace(/,(\s*[}\]])/g, '$1')
  return JSON.parse(clean)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: { description: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { description } = body
  if (!description?.trim()) {
    return NextResponse.json({ error: 'missing_description' }, { status: 400 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  let raw: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `${PROMPT}\n\n${description.trim()}`,
      }],
    })
    raw = message.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
  } catch (err) {
    console.error('Claude API error:', err)
    return NextResponse.json({ error: 'ai_error' }, { status: 502 })
  }

  if (!raw) {
    return NextResponse.json({ error: 'empty_response' }, { status: 422 })
  }

  let parsed: Omit<RecipeAnalysis, 'serving_weight_g' | 'per_100g'>
  try {
    parsed = extractJSON(raw) as Omit<RecipeAnalysis, 'serving_weight_g' | 'per_100g'>
  } catch {
    return NextResponse.json({ error: 'parse_failed' }, { status: 422 })
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
