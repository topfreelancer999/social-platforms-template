import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { format } from 'date-fns'

export function EventsPage() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => api<{ id: string; title: string; date: string; location: string; imageUrl: string; attendeeIds: string[] }[]>('/events'),
  })
  const rsvp = useMutation({
    mutationFn: (id: string) => api(`/events/${id}/rsvp`, { method: 'POST', headers: authHeaders(token) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Events</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        {events?.map((ev) => (
          <Card key={ev.id} className="p-0 overflow-hidden">
            <img src={ev.imageUrl} alt="" className="w-full h-32 object-cover" />
            <div className="p-3">
              <p className="font-semibold">{ev.title}</p>
              <p className="text-sm text-fb-muted">{format(new Date(ev.date), 'MMM d, yyyy')}</p>
              <p className="text-sm text-fb-muted">{ev.location}</p>
              <p className="text-xs mt-1">{ev.attendeeIds.length} going</p>
              <Button className="mt-2 w-full" onClick={() => rsvp.mutate(ev.id)}>Interested</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
