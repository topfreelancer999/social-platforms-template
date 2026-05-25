import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import type { Event } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/format'
import { useUIStore } from '@/stores/uiStore'

export function EventsPage() {
  const queryClient = useQueryClient()
  const showToast = useUIStore((s) => s.showToast)

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api<Event[]>('/events'),
  })

  const rsvp = useMutation({
    mutationFn: (id: string) =>
      api(`/events/${id}/rsvp`, { method: 'POST', headers: authHeaders() }),
    onSuccess: () => {
      showToast('You are attending!')
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  return (
    <div className="max-w-[800px] space-y-4">
      <h1 className="text-2xl font-semibold">Events</h1>
      {isLoading && <Spinner />}
      <div className="grid md:grid-cols-2 gap-3">
        {events?.map((ev) => (
          <Card key={ev.id} padding={false} className="overflow-hidden">
            <img src={ev.imageUrl} alt="" className="w-full h-32 object-cover" />
            <div className="p-4">
              <h2 className="font-semibold">{ev.title}</h2>
              <p className="text-sm text-linkedin-muted">{formatDate(ev.date)}</p>
              <p className="text-sm text-linkedin-muted">{ev.location}</p>
              <p className="text-xs text-linkedin-muted mt-2">
                {ev.attendeeIds.length} attending
              </p>
              <Button size="sm" className="mt-3" onClick={() => rsvp.mutate(ev.id)}>
                Attend
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
