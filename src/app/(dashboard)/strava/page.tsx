import { redirect } from 'next/navigation'
import { Bike, Check, Unlink, RefreshCw, Zap, Flame, Clock, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getProfile, getRecentStravaActivities } from '@/lib/supabase/queries'
import { connectStrava, disconnectStrava, syncStrava, enableStravaWebhook } from './actions'
import { listStravaPushSubscriptions } from '@/lib/strava'
import type { StravaActivity } from '@/types'

const ERROR_MESSAGES: Record<string, string> = {
  denied: "Tu as refusé l'autorisation Strava.",
  missing_code: 'Une erreur est survenue lors de la connexion à Strava.',
  invalid_state: 'La demande de connexion a expiré ou est invalide. Réessaie.',
  token_exchange: "Impossible d'échanger le code d'autorisation avec Strava.",
  save_failed: "Impossible d'enregistrer la connexion Strava.",
  not_connected: "Connecte d'abord ton compte Strava.",
  sync_failed: 'La synchronisation a échoué. Réessaie dans quelques instants.',
  webhook_failed: "Impossible d'activer la synchronisation automatique. Réessaie plus tard.",
}

const WEBHOOK_MESSAGES: Record<string, string> = {
  created: 'Synchronisation automatique activée ! Tes nouvelles activités Strava seront ajoutées toutes seules.',
  exists: 'La synchronisation automatique est déjà active sur cette app.',
}

const SPORT_LABELS: Record<string, string> = {
  Run: 'Course à pied',
  Ride: 'Vélo',
  VirtualRide: 'Vélo (virtuel)',
  Swim: 'Natation',
  Walk: 'Marche',
  Hike: 'Randonnée',
  WeightTraining: 'Musculation',
  Workout: 'Entraînement',
  Yoga: 'Yoga',
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h > 0) return `${h} h ${m.toString().padStart(2, '0')}`
  return `${m} min`
}

function formatDistance(meters: number | null): string | null {
  if (meters == null || meters <= 0) return null
  return `${(meters / 1000).toFixed(1)} km`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function ActivityCard({ activity }: { activity: StravaActivity }) {
  const distance = formatDistance(activity.distance_m)
  const sportLabel = SPORT_LABELS[activity.sport_type] ?? activity.sport_type

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold" style={{ color: '#0F0F0F' }}>{activity.name}</span>
          <span className="text-xs" style={{ color: '#6B6457' }}>{sportLabel} · {formatDate(activity.start_date)}</span>
        </div>
        {activity.calories != null && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0" style={{ backgroundColor: '#FFF1E8', color: '#FF6B2B' }}>
            <Flame size={12} strokeWidth={2.5} />
            {Math.round(activity.calories)} kcal
          </span>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs" style={{ color: '#6B6457' }}>
        <span className="flex items-center gap-1">
          <Clock size={13} />
          {formatDuration(activity.moving_time_s)}
        </span>
        {distance && (
          <span className="flex items-center gap-1">
            <MapPin size={13} />
            {distance}
          </span>
        )}
      </div>
    </div>
  )
}

export default async function StravaPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; synced?: string; webhook?: string; error?: string; detail?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(supabase, user.id)
  if (!profile) redirect('/login')

  const { connected, synced, webhook, error, detail } = await searchParams
  const isConnected = !!profile.strava_athlete_id && !!profile.strava_access_token

  const activities = isConnected ? await getRecentStravaActivities(supabase, user.id, 15) : []

  let isWebhookActive = false
  if (isConnected) {
    try {
      const subscriptions = await listStravaPushSubscriptions()
      isWebhookActive = subscriptions.length > 0
    } catch {}
  }

  return (
    <div className="flex flex-col gap-4 pt-3 px-4 pb-6">

      {/* Top bar */}
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-bold" style={{ color: '#0F0F0F' }}>Strava</h1>
      </div>

      {connected === '1' && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
          Compte Strava connecté avec succès !
        </div>
      )}
      {synced != null && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
          {Number(synced) > 0
            ? `${synced} nouvelle${Number(synced) > 1 ? 's' : ''} activité${Number(synced) > 1 ? 's' : ''} synchronisée${Number(synced) > 1 ? 's' : ''} !`
            : 'Tout est déjà à jour, aucune nouvelle activité.'}
        </div>
      )}
      {webhook && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
          {WEBHOOK_MESSAGES[webhook] ?? 'Synchronisation automatique mise à jour.'}
        </div>
      )}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium flex flex-col gap-1" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
          <span>{ERROR_MESSAGES[error] ?? 'Une erreur est survenue.'}</span>
          {detail && <span className="text-xs font-normal opacity-80 break-all">{detail}</span>}
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
          <div className="flex flex-col gap-2">
            <form action={syncStrava}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity active:opacity-70"
                style={{ backgroundColor: '#FF6B2B', color: '#FFFFFF' }}
              >
                <RefreshCw size={16} />
                Synchroniser mes activités
              </button>
            </form>
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
          </div>
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

      {/* Automatic sync via webhook */}
      {isConnected && (
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#FFF1E8' }}>
              <Zap size={18} color="#FF6B2B" strokeWidth={2.5} />
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-semibold" style={{ color: '#0F0F0F' }}>Synchronisation automatique</span>
              <span className="text-xs" style={{ color: '#6B6457' }}>Plus besoin de cliquer sur « Synchroniser »</span>
            </div>
          </div>
          <p className="text-sm" style={{ color: '#6B6457' }}>
            Active les notifications Strava pour que chaque nouvelle activité soit ajoutée à PlanVIT automatiquement, dès la fin de ta sortie.
          </p>
          {isWebhookActive ? (
            <div
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: '#DCFCE7', color: '#166534' }}
            >
              <Check size={16} strokeWidth={3} />
              Synchronisation automatique active
            </div>
          ) : (
            <form action={enableStravaWebhook}>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-opacity active:opacity-70"
                style={{ backgroundColor: '#F0EBE3', color: '#0F0F0F', border: '1px solid #DDD7CC' }}
              >
                <Zap size={16} />
                Activer la synchronisation automatique
              </button>
            </form>
          )}
        </div>
      )}

      {/* Activities list */}
      {isConnected && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold px-1" style={{ color: '#0F0F0F' }}>Activités récentes</h2>
          {activities.length === 0 ? (
            <div className="rounded-2xl p-5 text-center text-sm" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC', color: '#6B6457' }}>
              Aucune activité synchronisée pour le moment. Clique sur « Synchroniser mes activités » pour récupérer tes dernières sorties Strava.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
