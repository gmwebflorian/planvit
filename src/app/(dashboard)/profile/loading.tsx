function Skel({ w, h, rounded = 'rounded' }: { w: string; h: string; rounded?: string }) {
  return <div className={`${w} ${h} ${rounded} animate-pulse`} style={{ backgroundColor: '#2E2E2E' }} />
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
      {/* Avatar + identity */}
      <div className="rounded-3xl p-5 flex items-center gap-4" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }}>
        <Skel w="w-16" h="h-16" rounded="rounded-full" />
        <div className="flex flex-col gap-2">
          <Skel w="w-32" h="h-5" />
          <Skel w="w-44" h="h-4" />
        </div>
      </div>

      {/* Accordion sections */}
      <div className="h-14 rounded-2xl animate-pulse" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }} />
      <div className="h-14 rounded-2xl animate-pulse" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }} />

      {/* Sign out */}
      <div className="h-14 rounded-2xl animate-pulse" style={{ backgroundColor: '#1A1A1A', border: '1px solid #2E2E2E' }} />
    </div>
  )
}
