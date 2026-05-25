import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import type { Company, Job } from '@/types'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

export function SavedJobsPage() {
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: () =>
      api<(Job & { company?: Company })[]>('/jobs/saved', { headers: authHeaders() }),
  })

  return (
    <div className="max-w-[800px] space-y-4">
      <h1 className="text-2xl font-semibold">Saved jobs</h1>
      {isLoading && <Spinner />}
      {!jobs?.length && (
        <Card>
          <p className="text-linkedin-muted text-sm">No saved jobs yet.</p>
          <Link to="/jobs" className="text-linkedin-primary text-sm font-semibold mt-2 inline-block">
            Browse jobs
          </Link>
        </Card>
      )}
      {jobs?.map((job) => (
        <Card key={job.id}>
          <Link to={`/jobs/${job.id}`} className="font-semibold hover:underline">
            {job.title}
          </Link>
          <p className="text-sm text-linkedin-muted">{job.company?.name}</p>
        </Card>
      ))}
    </div>
  )
}
