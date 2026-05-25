import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Course } from '@/types'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

export function LearningPage() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => api<Course[]>('/courses'),
  })

  return (
    <div className="max-w-[900px] space-y-4">
      <h1 className="text-2xl font-semibold">Learning</h1>
      <p className="text-linkedin-muted text-sm">
        Develop skills with expert-led courses
      </p>
      {isLoading && <Spinner />}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {courses?.map((c) => (
          <Link key={c.id} to={`/learning/${c.id}`}>
            <Card padding={false} className="overflow-hidden hover:shadow-md transition-shadow">
              <img src={c.thumbnailUrl} alt="" className="w-full aspect-video object-cover" />
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-2">{c.title}</p>
                <p className="text-xs text-linkedin-muted mt-1">{c.instructor}</p>
                <p className="text-xs text-linkedin-muted">
                  {c.durationHours}h · {c.category}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
