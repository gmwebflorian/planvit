interface CalorieRingProps {
  consumed: number
  goal: number
  burned: number
}

export default function CalorieRing({ consumed, goal, burned }: CalorieRingProps) {
  const budget = goal + burned
  const remaining = Math.max(0, budget - consumed)
  const pct = Math.min(1, consumed / budget)
  const isOver = consumed > budget

  const size = 220
  const strokeWidth = 18
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - pct)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#242424"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isOver ? '#EF4444' : '#FF6B2B'}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums" style={{ color: '#FFFFFF' }}>
            {consumed.toLocaleString('fr-FR')}
          </span>
          <span className="text-sm" style={{ color: '#A0A0A0' }}>
            kcal consommées
          </span>
          <span className="text-xs mt-1" style={{ color: '#A0A0A0' }}>
            objectif {budget.toLocaleString('fr-FR')}
          </span>
        </div>
      </div>

      {/* Remaining */}
      <div className="flex flex-col items-center">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: isOver ? '#EF4444' : '#22C55E' }}
        >
          {isOver ? '+' : ''}{Math.abs(budget - consumed).toLocaleString('fr-FR')} kcal
        </span>
        <span className="text-sm" style={{ color: '#A0A0A0' }}>
          {isOver ? "au-dessus de l'objectif" : 'restantes'}
        </span>
      </div>

      {burned > 0 && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
          style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E', color: '#22C55E' }}
        >
          <span>🔥</span>
          <span>+{burned} kcal brûlées (Strava)</span>
        </div>
      )}
    </div>
  )
}
