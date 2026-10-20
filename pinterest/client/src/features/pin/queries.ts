import type { QueryClient } from '@tanstack/react-query'

/** Refreshes every list a pin can appear in after one is created or deleted. */
export function invalidatePinLists(qc: QueryClient) {
  for (const key of ['feed', 'explore', 'profile', 'board', 'my-boards', 'search']) {
    qc.invalidateQueries({ queryKey: [key] })
  }
}
