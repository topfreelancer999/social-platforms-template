export function MapPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 h-48 w-full max-w-sm rounded-2xl bg-gradient-to-br from-[var(--sc-blue)]/30 to-[var(--sc-purple)]/30 flex items-center justify-center">
        <span className="text-6xl">🗺️</span>
      </div>
      <h1 className="text-xl font-bold">Snap Map</h1>
      <p className="mt-2 max-w-xs text-sm text-white/60">
        See where friends are sharing location (demo placeholder). Use Chat and Stories for full messaging.
      </p>
    </div>
  )
}
