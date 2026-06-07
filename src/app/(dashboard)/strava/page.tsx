import { redirect } from 'next/navigation'
import { Bike, Check, Unlink } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/supabase/queries'
import { connectStrava, disconnectStrava } from './actions'

const ERROR_MESSAGES: Record<string, string> = {
  denied: "Tu as refusé l'autorisation Strava.",
  missing_code: 'Une erreur est survenue lors de la connexion à Strava.',
  token_exchange: "Impossible d'échanger le code d'autorisation avec Strava.",
  save_failed: "Impossible d'enregistrer la connexion Strava.",
}

export default async function StravaPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  const { connected, error } = await searchParams
  const isConnected = !!profile.strava_athlete_id && !!profile.strava_access_token

  return (
    <div className="flex flex-col gap-4 pt-3 px-4">

      {/* Top bar */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-bold" style={{ color: '#0F0F0F' }}>Strava</h1>
      </div>

      {connected === '1' && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
          Compte Strava connecté avec succès !
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
          {ERROR_MESSAGES[error] ?? 'Une erreur est survenue.'}
        </div>
      )}

      {/* Connection card */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FC4C02' }}>
            <Bike size={22} color="#FFFFFF" strokeWidth={2.5} />
          </span>
          <div className="flex flex-col">
            <span className="text-base font-semibold" style={{ color: '#0F0F0F' }}>Strava</span>
            <span className="text-xs" style={{ color: '#6B6457' }}>
              {isConnected ? 'Connecté' : 'Non connecté'}
            </span>
          </div>
          {isConnected && (
            <span className="ml-auto w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#DCFCE7' }}>
              <Check size={16} color="#166534" strokeWidth={3} />
            </span>
          )}
        </div>

        <p className="text-sm" style={{ color: '#6B6457' }}>
          {isConnected
            ? 'Tes activités Strava sont prises en compte pour ajuster ton budget calorique quotidien.'
            : 'Connecte ton compte Strava pour que les calories brûlées lors de tes activités soient automatiquement ajoutées à ton budget calorique du jour.'}
        </p>

        {isConnected ? (
          <form action={disconnectStrava}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity active:opacity-70"
              style={{ backgroundColor: '#F0EBE3', color: '#991B1B', border: '1px solid #DDD7CC' }}
            >
              <Unlink size={16} />
              Déconnecter Strava
            </button>
          </form>
        ) : (
          <form action={connectStrava}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity active:opacity-70"
              style={{ backgroundColor: '#FC4C02', color: '#FFFFFF' }}
            >
              <Bike size={16} />
              Connecter mon compte Strava
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
