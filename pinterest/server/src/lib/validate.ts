import type { ZodError } from 'zod'

/** Turns a Zod error into the `{ message }` text the client shows, e.g. "title: Add a title". */
export function zodMessage(error: ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'Invalid request'
  return issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message
}
