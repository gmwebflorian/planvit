function Skel({ w, h, rounded = 'rounded' }: { w: string; h: string; rounded?: string }) {
  return <div className={`${w} ${h} ${rounded} animate-pulse`} style={{ backgroundColor: '#2E2E2E' }} />
}

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen px-4 pt-5 gap-5" style={{ backgroundColor: '#0F0F0F' }}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skel w="w-6" h="h-6" rounded="rounded-lg" />
        <Skel w="w-44" h="h-5" />
      </div>

      {/* Food card */}
      <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <Skel w="w-40" h="h-6" />
            <Skel w="w-28" h="h-4" />
          </div>
          <Skel w="w-7" h="h-7" rounded="rounded-full" />
        </div>

        <div className="h-px w-full" style={{ backgroundColor: '#2E2E2E' }} />

        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl p-3 flex flex-col gap-2" style={{ backgroundColor: '#242424' }}>
              <Skel w="w-14" h="h-3" />
              <Skel w="w-20" h="h-6" />
            </div>
          ))}
        </div>

        <Skel w="w-36" h="h-3" />
      </div>

      {/* Delete button */}
      <div className="h-14 rounded-2xl animate-pulse" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }} />
    </div>
  )
}
