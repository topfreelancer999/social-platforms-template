import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Company, Job } from '@/types'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { formatRelative } from '@/lib/format'

export function JobsPage() {
  const [q, setQ] = useState('')
  const [remote, setRemote] = useState(false)

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs', q, remote],
    queryFn: () =>
      api<(Job & { company?: Company })[]>(
        `/jobs?q=${encodeURIComponent(q)}${remote ? '&remote=true' : ''}`,
      ),
  })

  return (
    <div className="max-w-[800px] space-y-4">
      <h1 className="text-2xl font-semibold">Jobs</h1>
      <Card>
        <div className="flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jobs"
            className="flex-1 min-w-[200px] border rounded px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
            Remote only
          </label>
        </div>
      </Card>
      <div className="flex gap-4 text-sm">
        <Link to="/jobs" className="font-semibold text-linkedin-primary">
          All jobs
        </Link>
        <Link to="/jobs/saved" className="text-linkedin-muted hover:text-linkedin-primary">
          Saved jobs
        </Link>
      </div>
      {isLoading && <Spinner className="mx-auto" />}
      <div className="space-y-2">
        {jobs?.map((job) => (
          <Card key={job.id} className="flex gap-4">
            <img src={job.company?.logoUrl} alt="" className="w-14 h-14 rounded object-cover" />
            <div className="flex-1">
              <Link to={`/jobs/${job.id}`} className="font-semibold hover:underline">
                {job.title}
                {job.promoted && (
                  <span className="ml-2 text-xs text-linkedin-muted">· Promoted</span>
                )}
              </Link>
              <p className="text-sm text-linkedin-muted">{job.company?.name}</p>
              <p className="text-sm text-linkedin-muted">
                {job.location} {job.remote && '· Remote'}
              </p>
              <p className="text-xs text-linkedin-muted mt-1">
                {formatRelative(job.postedAt)} · {job.applicants} applicants
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
