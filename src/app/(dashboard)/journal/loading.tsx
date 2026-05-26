function Skel({ w, h, rounded = 'rounded' }: { w: string; h: string; rounded?: string }) {
  return <div className={`${w} ${h} ${rounded} animate-pulse`} style={{ backgroundColor: '#2E2E2E' }} />
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skel w="w-28" h="h-5" />
        <Skel w="w-8" h="h-8" rounded="rounded-xl" />
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between">
        <Skel w="w-8" h="h-8" rounded="rounded-full" />
        <Skel w="w-36" h="h-4" />
        <Skel w="w-8" h="h-8" rounded="rounded-full" />
      </div>

      {/* Calories summary */}
      <div className="rounded-2xl px-5 py-4 flex justify-between" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skel w="w-12" h="h-5" />
            <Skel w="w-16" h="h-3" />
          </div>
        ))}
      </div>

      {/* Meal sections */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl px-4 py-4 flex flex-col gap-3" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
          <Skel w="w-32" h="h-4" />
          <Skel w="w-48" h="h-3" />
        </div>
      ))}
    </div>
  )
}
