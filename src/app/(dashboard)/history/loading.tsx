function Skel({ w, h, rounded = 'rounded' }: { w: string; h: string; rounded?: string }) {
  return <div className={`${w} ${h} ${rounded} animate-pulse`} style={{ backgroundColor: '#DDD7CC' }} />
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Skel w="w-6" h="h-6" rounded="rounded-lg" />
        <Skel w="w-28" h="h-5" />
      </div>

      {/* Period toggle */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skel key={i} w="w-16" h="h-8" rounded="rounded-full" />
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-3xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
        <Skel w="w-32" h="h-4" />
        <div className="mt-4 flex items-end gap-1 h-32">
          {[40, 65, 50, 80, 55, 70, 45, 90, 60, 75, 50, 85, 40, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t animate-pulse" style={{ height: `${h}%`, backgroundColor: '#DDD7CC' }} />
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
            <Skel w="w-12" h="h-3" />
            <Skel w="w-16" h="h-5" />
          </div>
        ))}
      </div>
    </div>
  )
}
