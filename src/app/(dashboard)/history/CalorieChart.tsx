interface DayData {
  date: string
  calories: number
  goal: number
}

interface Props {
  days: DayData[]
}

const W = 340
const H = 160
const PAD = { top: 12, right: 12, bottom: 28, left: 36 }

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function CalorieChart({ days }: Props) {
  if (days.length === 0) return null

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxCal = Math.max(...days.map((d) => Math.max(d.calories, d.goal)), 100)
  const yMax = Math.ceil(maxCal / 500) * 500

  const xScale = (i: number) => PAD.left + (i / Math.max(days.length - 1, 1)) * innerW
  const yScale = (v: number) => PAD.top + innerH - clamp(v / yMax, 0, 1) * innerH

  // Consumed line path
  const consumedPath = days
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(d.calories).toFixed(1)}`)
    .join(' ')

  // Goal line path (dashed)
  const goalPath = days
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(d.goal).toFixed(1)}`)
    .join(' ')

  // Y grid lines
  const yTicks = [0, Math.round(yMax / 2), yMax]

  // X labels — show only first, middle, last
  const xLabelIdxs = [0, Math.floor((days.length - 1) / 2), days.length - 1].filter(
    (v, i, a) => a.indexOf(v) === i
  )

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ overflow: 'visible' }}
      aria-label="Graphique calories"
    >
      {/* Grid lines */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yScale(tick)}
            y2={yScale(tick)}
            stroke="#2E2E2E"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={yScale(tick)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={9}
            fill="#A0A0A0"
          >
            {tick === 0 ? '0' : tick >= 1000 ? `${tick / 1000}k` : String(tick)}
          </text>
        </g>
      ))}

      {/* Goal line (dashed) */}
      <path
        d={goalPath}
        fill="none"
        stroke="#22C55E"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.7}
      />

      {/* Consumed area fill */}
      <path
        d={`${consumedPath} L${xScale(days.length - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${xScale(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`}
        fill="#FF6B2B"
        opacity={0.08}
      />

      {/* Consumed line */}
      <path
        d={consumedPath}
        fill="none"
        stroke="#FF6B2B"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {days.map((d, i) => {
        const isOver = d.calories > d.goal
        const cx = xScale(i)
        const cy = yScale(d.calories)
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={3}
            fill={isOver ? '#EF4444' : '#FF6B2B'}
            stroke="#0F0F0F"
            strokeWidth={1.5}
          />
        )
      })}

      {/* X axis labels */}
      {xLabelIdxs.map((i) => {
        const d = days[i]
        const label = new Date(d.date + 'T00:00:00').toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        })
        return (
          <text
            key={i}
            x={xScale(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#A0A0A0"
          >
            {label}
          </text>
        )
      })}

      {/* Legend */}
      <g transform={`translate(${PAD.left}, ${PAD.top - 2})`}>
        <line x1={0} x2={12} y1={0} y2={0} stroke="#FF6B2B" strokeWidth={2} />
        <text x={16} y={0} dominantBaseline="middle" fontSize={9} fill="#A0A0A0">Consommé</text>
        <line x1={70} x2={82} y1={0} y2={0} stroke="#22C55E" strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={86} y={0} dominantBaseline="middle" fontSize={9} fill="#A0A0A0">Objectif</text>
      </g>
    </svg>
  )
}
