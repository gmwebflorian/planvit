function Skel({ w, h, rounded = 'rounded' }: { w: string; h: string; rounded?: string }) {
  return <div className={`${w} ${h} ${rounded} animate-pulse`} style={{ backgroundColor: '#DDD7CC' }} />
}

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#E8E2D6' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3">
        <Skel w="w-6" h="h-6" rounded="rounded-lg" />
        <Skel w="w-40" h="h-5" />
      </div>

      {/* Search bar */}
      <div className="px-4 pb-3">
        <div className="h-12 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }} />
      </div>

      {/* Food cards */}
      <div className="px-4 flex flex-col gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl px-4 py-3 flex flex-col gap-2" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
            <Skel w="w-40" h="h-4" />
            <Skel w="w-56" h="h-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
