import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import type { Course, CourseProgress } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Play } from 'lucide-react'

export function CoursePage() {
  const { courseId } = useParams()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () =>
      api<{ course: Course; progress?: CourseProgress }>(`/courses/${courseId}`, {
        headers: authHeaders(),
      }),
  })

  const completeLesson = useMutation({
    mutationFn: (lessonId: string) =>
      api(`/courses/${courseId}/progress`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ lessonId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  })

  if (isLoading) return <Spinner className="mx-auto mt-12" />
  if (!data) return <p>Course not found</p>

  const { course, progress } = data
  const completed = new Set(progress?.completedLessonIds ?? [])

  return (
    <div className="max-w-[900px] space-y-4">
      <Card padding={false} className="overflow-hidden">
        <div className="aspect-video bg-gray-900 flex items-center justify-center relative">
          <img
            src={course.thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="relative z-10 text-center text-white">
            <Play size={48} className="mx-auto mb-2 opacity-80" />
            <p className="text-sm">Video player (demo)</p>
          </div>
        </div>
        <div className="p-6">
          <h1 className="text-xl font-semibold">{course.title}</h1>
          <p className="text-linkedin-muted text-sm mt-1">
            {course.instructor} · {course.durationHours} hours
          </p>
          {progress && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-linkedin-primary transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-sm mt-4">{course.description}</p>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold mb-3">Course content</h2>
        <ul className="space-y-2">
          {course.lessons.map((lesson, i) => (
            <li
              key={lesson.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div>
                <p className="text-sm font-medium">
                  {i + 1}. {lesson.title}
                </p>
                <p className="text-xs text-linkedin-muted">{lesson.durationMinutes} min</p>
              </div>
              {completed.has(lesson.id) ? (
                <span className="text-xs text-green-600 font-semibold">Completed</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => completeLesson.mutate(lesson.id)}
                >
                  Mark complete
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
