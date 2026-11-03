'use client'

import { useState, useMemo } from 'react'
import { AlertTriangle, Zap } from 'lucide-react'
import type { Sex } from '@/types'

const PAL_LEVELS = [
  { key: 'sedentary', label: 'Sédentaire', desc: 'Peu/pas d\'exercice, travail de bureau', multiplier: 1.2 },
  { key: 'light', label: 'Légèrement actif', desc: 'Sport léger 1–3 j/semaine', multiplier: 1.375 },
  { key: 'moderate', label: 'Modérément actif', desc: 'Sport modéré 3–5 j/semaine', multiplier: 1.55 },
  { key: 'active', label: 'Très actif', desc: 'Sport intense 6–7 j/semaine', multiplier: 1.725 },
  { key: 'extreme', label: 'Extrêmement actif', desc: 'Sport intense + travail physique', multiplier: 1.9 },
] as const

const DEFICIT_LEVELS = [
  {
    key: 'light' as const,
    label: 'Déficit léger',
    deficit: 250,
    lossKgPerWeek: 0.22,
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    desc: 'Perte douce, masse musculaire préservée',
  },
  {
    key: 'moderate' as const,
    label: 'Déficit modéré',
    deficit: 500,
    lossKgPerWeek: 0.45,
    color: '#d97706',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
    desc: 'Standard clinique recommandé',
  },
  {
    key: 'high' as const,
    label: 'Déficit élevé',
    deficit: 750,
    lossKgPerWeek: 0.67,
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    desc: 'Protéines ↑ + musculation conseillés',
  },
]

type PalKey = typeof PAL_LEVELS[number]['key']
type DeficitKey = typeof DEFICIT_LEVELS[number]['key']
type GoalType = 'cut' | 'maintain' | 'bulk'

interface Goals {
  goal_calories: number
  goal_protein_g: number
  goal_carbs_g: number
  goal_fat_g: number
  goal_fiber_g: number
}

interface Props {
  sex: Sex | null
  weightKg: number | null
  heightCm: number | null
  birthDate: string | null
  onApply: (goals: Goals) => void
}

function calcAge(birthDate: string): number {
  const dob = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

function calcBMR(sex: Sex, weightKg: number, heightCm: number, birthDate: string): number {
  const age = calcAge(birthDate)
  if (sex === 'male') return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
}

export default function CalorieCalculator({ sex, weightKg, heightCm, birthDate, onApply }: Props) {
  const [palKey, setPalKey] = useState<PalKey>('moderate')
  const [goalType, setGoalType] = useState<GoalType>('cut')
  const [selectedDeficit, setSelectedDeficit] = useState<DeficitKey>('moderate')

  const isComplete = !!(sex && weightKg && heightCm && birthDate)

  const bmr = useMemo(() => {
    if (!isComplete) return null
    return calcBMR(sex!, weightKg!, heightCm!, birthDate!)
  }, [sex, weightKg, heightCm, birthDate, isComplete])

  const pal = PAL_LEVELS.find(p => p.key === palKey)!
  const tdee = bmr ? Math.round(bmr * pal.multiplier) : null
  const safetyFloor = sex === 'female' ? 1200 : 1500

  const getTargetCalories = (deficitKey: DeficitKey): number | null => {
    if (!tdee) return null
    if (goalType === 'maintain') return tdee
    if (goalType === 'bulk') return tdee + 250
    const d = DEFICIT_LEVELS.find(x => x.key === deficitKey)!
    return Math.max(tdee - d.deficit, safetyFloor)
  }

  const getMacros = (calories: number): Omit<Goals, 'goal_calories'> => {
    const protein_g = Math.round((weightKg ?? 70) * 1.8)
    const fat_g = Math.round((calories * 0.27) / 9)
    const remaining = calories - protein_g * 4 - fat_g * 9
    const carbs_g = Math.max(Math.round(remaining / 4), 50)
    return { goal_protein_g: protein_g, goal_fat_g: fat_g, goal_carbs_g: carbs_g, goal_fiber_g: 28 }
  }

  const handleApply = () => {
    const calories = goalType === 'cut'
      ? getTargetCalories(selectedDeficit)
      : goalType === 'maintain' ? tdee : tdee ? tdee + 250 : null
    if (!calories) return
    onApply({ goal_calories: calories, ...getMacros(calories) })
  }

  if (!isComplete) {
    return (
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: '#FFF9F5', border: '1px solid #FFDCC8' }}>
        <AlertTriangle size={16} color="#FF6B2B" className="shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: '#6B6457' }}>
          Complète tes données personnelles (sexe, poids, taille, date de naissance) pour utiliser la calculatrice.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">

      {/* BMR / TDEE */}
      <div className="rounded-xl p-4 grid grid-cols-2 gap-3" style={{ backgroundColor: '#F0EBE3' }}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B6457' }}>Métabolisme de base</p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: '#0F0F0F' }}>{Math.round(bmr!)}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B6457' }}>kcal · BMR</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B6457' }}>Maintenance</p>
          <p className="text-2xl font-bold tabular-nums mt-1" style={{ color: '#FF6B2B' }}>{tdee}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B6457' }}>kcal · TDEE</p>
        </div>
      </div>

      {/* Activity level */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide mb-2.5" style={{ color: '#6B6457' }}>Niveau d'activité</p>
        <div className="flex flex-col gap-1.5">
          {PAL_LEVELS.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPalKey(p.key)}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors"
              style={{
                backgroundColor: palKey === p.key ? '#FF6B2B' : '#F7F4F1',
                border: `1.5px solid ${palKey === p.key ? '#FF6B2B' : '#DDD7CC'}`,
              }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: palKey === p.key ? '#FFFFFF' : '#0F0F0F' }}>{p.label}</p>
                <p className="text-xs mt-0.5" style={{ color: palKey === p.key ? 'rgba(255,255,255,0.72)' : '#6B6457' }}>{p.desc}</p>
              </div>
              <span className="text-xs font-mono ml-3 shrink-0" style={{ color: palKey === p.key ? 'rgba(255,255,255,0.72)' : '#6B6457' }}>×{p.multiplier}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Goal type */}
      <div>
        <p className="text-xs font-medium uppercase tracking-wide mb-2.5" style={{ color: '#6B6457' }}>Objectif</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { key: 'cut' as GoalType, label: 'Perte de\npoids', icon: '↓' },
            { key: 'maintain' as GoalType, label: 'Maintien', icon: '=' },
            { key: 'bulk' as GoalType, label: 'Prise de\nmasse', icon: '↑' },
          ] as { key: GoalType; label: string; icon: string }[]).map(g => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGoalType(g.key)}
              className="py-3 px-2 rounded-xl text-center transition-colors"
              style={{
                backgroundColor: goalType === g.key ? '#FF6B2B' : '#F7F4F1',
                border: `1.5px solid ${goalType === g.key ? '#FF6B2B' : '#DDD7CC'}`,
              }}
            >
              <p className="text-lg leading-none" style={{ color: goalType === g.key ? '#FFFFFF' : '#0F0F0F' }}>{g.icon}</p>
              <p className="text-xs font-medium mt-1 whitespace-pre-line leading-tight" style={{ color: goalType === g.key ? '#FFFFFF' : '#0F0F0F' }}>{g.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Deficit cards */}
      {goalType === 'cut' && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-2.5" style={{ color: '#6B6457' }}>Niveau de déficit</p>
          <div className="flex flex-col gap-2">
            {DEFICIT_LEVELS.map(d => {
              const targetCal = getTargetCalories(d.key)!
              const isFloor = targetCal === safetyFloor
              const isSelected = selectedDeficit === d.key
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setSelectedDeficit(d.key)}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-colors"
                  style={{
                    backgroundColor: isSelected ? d.bgColor : '#FAFAF9',
                    border: `1.5px solid ${isSelected ? d.borderColor : '#E8E3DC'}`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: d.color }}>{d.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: d.bgColor, color: d.color, border: `1px solid ${d.borderColor}` }}>
                        −{d.deficit} kcal/j
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: '#6B6457' }}>{d.desc}</p>
                    {isFloor && (
                      <p className="text-xs mt-1 font-medium" style={{ color: '#dc2626' }}>⚠ Plancher de sécurité ({safetyFloor} kcal)</p>
                    )}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="text-lg font-bold tabular-nums" style={{ color: d.color }}>{targetCal}</p>
                    <p className="text-xs tabular-nums" style={{ color: '#6B6457' }}>~{d.lossKgPerWeek} kg/sem</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Maintain / bulk summary */}
      {goalType !== 'cut' && tdee && (
        <div className="rounded-xl px-4 py-3.5 flex items-center justify-between" style={{ backgroundColor: '#F0EBE3', border: '1px solid #DDD7CC' }}>
          <span className="text-sm" style={{ color: '#6B6457' }}>Objectif calorique</span>
          <span className="text-xl font-bold tabular-nums" style={{ color: '#0F0F0F' }}>
            {goalType === 'maintain' ? tdee : tdee + 250} kcal/j
          </span>
        </div>
      )}

      {/* Apply */}
      <button
        type="button"
        onClick={handleApply}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold"
        style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
      >
        <Zap size={16} />
        Appliquer à mes objectifs
      </button>

      <p className="text-xs text-center" style={{ color: '#9B9086' }}>
        Macros estimées : protéines 1,8 g/kg · lipides 27% · glucides reste. Ajustables dans "Mes objectifs".
      </p>
    </div>
  )
}
