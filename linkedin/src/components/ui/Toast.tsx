import { useUIStore } from '@/stores/uiStore'

export function Toast() {
  const toast = useUIStore((s) => s.toast)
  if (!toast) return null
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg text-sm">
      {toast}
    </div>
  )
}
