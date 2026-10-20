import type { ZodError } from 'zod'

/** First Zod issue as a readable `{ message }` string, e.g. "isPrivate: Expected boolean, received string". */
export function zodMessage(error: ZodError) {
  const issue = error.issues[0]
  if (!issue) return 'Invalid input'
  return issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message
}
