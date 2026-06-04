interface MacroBarProps {
  label: string
  current: number
  goal: number
  color: string
  unit?: string
}

export default function MacroBar({ label, current, goal, color, unit = 'g' }: MacroBarProps) {
  const pct = Math.min(1, current / goal)
  const isOver = current > goal
  const remaining = Math.max(0, goal - current)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: '#0F0F0F' }}>{label}</span>
        <span className="text-sm tabular-nums" style={{ color: '#6B6457' }}>
          {current}{unit} / {goal}{unit}
        </span>
      </div>

      {/* Track */}
      <div className="h-2.5 rounded-full" style={{ backgroundColor: '#F0EBE3' }}>
        <div
          className="h-2.5 rounded-full transition-all duration-500"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: isOver ? '#EF4444' : color,
          }}
        />
      </div>

      <span className="text-xs tabular-nums" style={{ color: isOver ? '#EF4444' : '#A0A0A0' }}>
        {isOver
          ? `${current - goal}${unit} au-dessus`
          : `${remaining}${unit} restants`}
      </span>
    </div>
  )
}
