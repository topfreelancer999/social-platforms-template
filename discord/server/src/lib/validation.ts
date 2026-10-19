import type { ZodError } from 'zod'

/** First zod issue as a readable `{ message }` string, e.g. "color: Number must be ...". */
export function zodMessage(err: ZodError) {
  const issue = err.issues[0]
  if (!issue) return 'Invalid request'
  return issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message
}
