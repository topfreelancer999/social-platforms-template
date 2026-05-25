import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import type { Company, Job } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useUIStore } from '@/stores/uiStore'
import { formatRelative } from '@/lib/format'

export function JobDetailPage() {
  const { id } = useParams()
  const [applyOpen, setApplyOpen] = useState(false)
  const [resume, setResume] = useState('resume.pdf')
  const showToast = useUIStore((s) => s.showToast)
  const queryClient = useQueryClient()

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => api<Job & { company?: Company }>(`/jobs/${id}`),
  })

  const apply = useMutation({
    mutationFn: () =>
      api(`/jobs/${id}/apply`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ resumeName: resume }),
      }),
    onSuccess: () => {
      showToast('Application submitted!')
      setApplyOpen(false)
      queryClient.invalidateQueries({ queryKey: ['job', id] })
    },
  })

  const save = useMutation({
    mutationFn: () =>
      api(`/jobs/${id}/save`, { method: 'POST', headers: authHeaders() }),
    onSuccess: () => showToast('Job saved'),
  })

  if (isLoading) return <Spinner className="mx-auto mt-12" />
  if (!job) return <p>Job not found</p>

  return (
    <div className="max-w-[800px] space-y-4">
      <Card>
        <div className="flex gap-4">
          <img src={job.company?.logoUrl} alt="" className="w-16 h-16 rounded" />
          <div>
            <h1 className="text-xl font-semibold">{job.title}</h1>
            <p className="text-linkedin-muted">{job.company?.name}</p>
            <p className="text-sm text-linkedin-muted">
              {job.location} · {job.employmentType} · {job.experienceLevel}
            </p>
            <p className="text-xs text-linkedin-muted mt-1">
              Posted {formatRelative(job.postedAt)} · {job.applicants} applicants
            </p>
            {job.salary && <p className="text-sm mt-2">{job.salary}</p>}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button onClick={() => setApplyOpen(true)}>Easy Apply</Button>
          <Button variant="outline" onClick={() => save.mutate()}>
            Save
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold mb-2">About the job</h2>
        <p className="text-sm whitespace-pre-wrap">{job.description}</p>
      </Card>
      <Card>
        <h2 className="font-semibold mb-2">Qualifications</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {job.qualifications.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </Card>
      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Easy Apply">
        <p className="text-sm text-linkedin-muted mb-4">
          Submit your application to {job.company?.name}
        </p>
        <label className="block text-sm font-medium mb-1">Resume</label>
        <input
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm mb-4"
        />
        <Button
          className="w-full"
          onClick={() => apply.mutate()}
          disabled={apply.isPending}
        >
          Submit application
        </Button>
      </Modal>
    </div>
  )
}
