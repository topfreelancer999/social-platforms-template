import { http, HttpResponse } from 'msw'
import { getDb, requireUserId, setDb } from '../db'

export const learningHandlers = [
  http.get('/api/courses', () => HttpResponse.json(getDb().courses)),

  http.get('/api/courses/:id', ({ params, request }) => {
    const userId = requireUserId(request.headers)
    const db = getDb()
    const course = db.courses.find((c) => c.id === params.id)
    if (!course) return HttpResponse.json({ message: 'Not found' }, { status: 404 })
    const progress = userId
      ? db.courseProgress.find(
          (p) => p.courseId === course.id && p.userId === userId,
        )
      : undefined
    return HttpResponse.json({ course, progress })
  }),

  http.post('/api/courses/:id/progress', async ({ params, request }) => {
    const userId = requireUserId(request.headers)
    if (!userId) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
    const { lessonId } = (await request.json()) as { lessonId: string }
    const db = getDb()
    const course = db.courses.find((c) => c.id === params.id)!
    setDb((d) => {
      let p = d.courseProgress.find(
        (x) => x.courseId === params.id && x.userId === userId,
      )
      if (!p) {
        p = { courseId: params.id as string, userId, completedLessonIds: [], percent: 0 }
        d.courseProgress.push(p)
      }
      if (!p.completedLessonIds.includes(lessonId)) {
        p.completedLessonIds.push(lessonId)
      }
      p.percent = Math.round(
        (p.completedLessonIds.length / course.lessons.length) * 100,
      )
    })
    return HttpResponse.json(
      getDb().courseProgress.find(
        (x) => x.courseId === params.id && x.userId === userId,
      ),
    )
  }),
]
