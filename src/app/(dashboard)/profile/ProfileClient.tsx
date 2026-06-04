'use client'

import { useState, useTransition } from 'react'
import { LogOut, Save, ChevronDown } from 'lucide-react'
import { updateProfile } from './actions'
import { signOut } from '@/app/(auth)/actions'
import type { UserProfile, Sex } from '@/types'

interface Props {
  profile: UserProfile
  email: string
  bmr: number | null
  tdee: number | null
}

type Section = 'goals' | 'data'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B6457' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  placeholder,
  unit,
  min,
  max,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  unit?: string
  min?: number
  max?: number
}) {
  return (
    <div
      className="flex items-center rounded-xl px-4"
      style={{ backgroundColor: '#F0EBE3', border: '1px solid #DDD7CC' }}
    >
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="flex-1 bg-transparent py-3 outline-none text-base tabular-nums"
        style={{ color: '#0F0F0F' }}
      />
      {unit && (
        <span className="text-sm ml-2 shrink-0" style={{ color: '#6B6457' }}>{unit}</span>
      )}
    </div>
  )
}

export default function ProfileClient({ profile, email, bmr, tdee }: Props) {
  const [openSection, setOpenSection] = useState<Section | null>('goals')
  const [isPending, startTransition] = useTransition()

  // Goals
  const [goalCal, setGoalCal] = useState(String(profile.goal_calories ?? ''))
  const [goalProt, setGoalProt] = useState(String(profile.goal_protein_g ?? ''))
  const [goalCarbs, setGoalCarbs] = useState(String(profile.goal_carbs_g ?? ''))
  const [goalFat, setGoalFat] = useState(String(profile.goal_fat_g ?? ''))
  const [goalFiber, setGoalFiber] = useState(String(profile.goal_fiber_g ?? ''))

  // Personal data
  const [weight, setWeight] = useState(String(profile.weight_kg ?? ''))
  const [height, setHeight] = useState(String(profile.height_cm ?? ''))
  const [birthDate, setBirthDate] = useState(profile.birth_date ?? '')
  const [sex, setSex] = useState<Sex | ''>(profile.sex ?? '')

  const saveGoals = () => {
    startTransition(async () => {
      await updateProfile({
        goal_calories: goalCal ? parseInt(goalCal) : null,
        goal_protein_g: goalProt ? parseInt(goalProt) : null,
        goal_carbs_g: goalCarbs ? parseInt(goalCarbs) : null,
        goal_fat_g: goalFat ? parseInt(goalFat) : null,
        goal_fiber_g: goalFiber ? parseInt(goalFiber) : null,
      })
    })
  }

  const saveData = () => {
    startTransition(async () => {
      await updateProfile({
        weight_kg: weight ? parseFloat(weight) : null,
        height_cm: height ? parseFloat(height) : null,
        birth_date: birthDate || null,
        sex: (sex as Sex) || null,
      })
    })
  }

  const initials = profile.full_name?.slice(0, 1).toUpperCase() ?? email.slice(0, 1).toUpperCase()

  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8">

      {/* Avatar + identity */}
      <div
        className="rounded-3xl p-5 flex items-center gap-4"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? ''}
            className="w-16 h-16 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0"
            style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
          >
            {initials}
          </div>
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-bold text-lg truncate" style={{ color: '#0F0F0F' }}>
            {profile.full_name ?? '—'}
          </span>
          <span className="text-sm truncate" style={{ color: '#6B6457' }}>{email}</span>
        </div>
      </div>

      {/* Goals section */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
      >
        <button
          onClick={() => setOpenSection(openSection === 'goals' ? null : 'goals')}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <span className="font-semibold" style={{ color: '#0F0F0F' }}>Mes objectifs</span>
          <ChevronDown
            size={18}
            color="#6B6457"
            style={{ transform: openSection === 'goals' ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
          />
        </button>

        {openSection === 'goals' && (
          <div className="px-5 pb-5 flex flex-col gap-4" style={{ borderTop: '1px solid #DDD7CC' }}>
            <div className="pt-4 flex flex-col gap-4">
              <Field label="Calories (kcal/jour)">
                <NumberInput value={goalCal} onChange={setGoalCal} placeholder="2000" min={800} max={6000} unit="kcal" />
              </Field>
              <Field label="Protéines">
                <NumberInput value={goalProt} onChange={setGoalProt} placeholder="170" unit="g" />
              </Field>
              <Field label="Glucides">
                <NumberInput value={goalCarbs} onChange={setGoalCarbs} placeholder="190" unit="g" />
              </Field>
              <Field label="Lipides">
                <NumberInput value={goalFat} onChange={setGoalFat} placeholder="65" unit="g" />
              </Field>
              <Field label="Fibres">
                <NumberInput value={goalFiber} onChange={setGoalFiber} placeholder="25" unit="g" />
              </Field>
            </div>

            <button
              onClick={saveGoals}
              disabled={isPending}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
            >
              <Save size={16} />
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      {/* Personal data section */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}
      >
        <button
          onClick={() => setOpenSection(openSection === 'data' ? null : 'data')}
          className="w-full flex items-center justify-between px-5 py-4"
        >
          <span className="font-semibold" style={{ color: '#0F0F0F' }}>Mes données</span>
          <ChevronDown
            size={18}
            color="#6B6457"
            style={{ transform: openSection === 'data' ? 'rotate(180deg)' : 'none', transition: '0.2s' }}
          />
        </button>

        {openSection === 'data' && (
          <div className="px-5 pb-5 flex flex-col gap-4" style={{ borderTop: '1px solid #DDD7CC' }}>
            <div className="pt-4 flex flex-col gap-4">
              <Field label="Poids">
                <NumberInput value={weight} onChange={setWeight} placeholder="75" unit="kg" min={30} max={300} />
              </Field>
              <Field label="Taille">
                <NumberInput value={height} onChange={setHeight} placeholder="175" unit="cm" min={100} max={250} />
              </Field>
              <Field label="Date de naissance">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="rounded-xl px-4 py-3 outline-none text-base"
                  style={{ backgroundColor: '#F0EBE3', border: '1px solid #DDD7CC', color: '#0F0F0F' }}
                />
              </Field>
              <Field label="Sexe">
                <div className="grid grid-cols-2 gap-2">
                  {(['male', 'female'] as Sex[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(s)}
                      className="py-3 rounded-xl text-sm font-medium"
                      style={{
                        backgroundColor: sex === s ? '#FF6B2B' : '#242424',
                        color: sex === s ? '#FFFFFF' : '#A0A0A0',
                        border: '1px solid #DDD7CC',
                      }}
                    >
                      {s === 'male' ? 'Homme' : 'Femme'}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* BMR / TDEE display */}
            {(bmr || tdee) && (
              <div
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{ backgroundColor: '#F0EBE3' }}
              >
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#6B6457' }}>
                  Métabolisme calculé
                </p>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#6B6457' }}>BMR</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: '#0F0F0F' }}>
                    {bmr ? `${Math.round(bmr)} kcal` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm" style={{ color: '#6B6457' }}>TDEE (×1.375)</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: '#0F0F0F' }}>
                    {tdee ? `${Math.round(tdee)} kcal` : '—'}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={saveData}
              disabled={isPending}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold disabled:opacity-50"
              style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
            >
              <Save size={16} />
              {isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      {/* Sign out */}
      <form action={signOut}>
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC', color: '#6B6457' }}
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </form>
    </div>
  )
}
