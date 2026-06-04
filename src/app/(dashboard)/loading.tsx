function Skel({ w, h, rounded = 'rounded' }: { w: string; h: string; rounded?: string }) {
  return <div className={`${w} ${h} ${rounded} animate-pulse`} style={{ backgroundColor: '#DDD7CC' }} />
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skel w="w-10" h="h-10" rounded="rounded-full" />
          <div className="flex flex-col gap-2">
            <Skel w="w-32" h="h-4" />
            <Skel w="w-24" h="h-3" />
          </div>
        </div>
        <Skel w="w-6" h="h-6" />
      </div>

      {/* Calorie ring */}
      <div className="rounded-3xl p-6 flex flex-col items-center gap-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
        <Skel w="w-44" h="h-44" rounded="rounded-full" />
        <Skel w="w-32" h="h-4" />
      </div>

      {/* Macro bars */}
      <div className="rounded-3xl px-5 py-4 flex flex-col gap-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
        <Skel w="w-36" h="h-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="flex justify-between">
              <Skel w="w-20" h="h-3" />
              <Skel w="w-14" h="h-3" />
            </div>
            <Skel w="w-full" h="h-2" rounded="rounded-full" />
          </div>
        ))}
      </div>

      {/* Meal sections */}
      <div className="flex flex-col gap-3">
        <Skel w="w-28" h="h-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl px-4 py-4 flex flex-col gap-3" style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDD7CC' }}>
            <Skel w="w-32" h="h-4" />
            <Skel w="w-48" h="h-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
