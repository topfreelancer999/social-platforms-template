import type { z } from 'zod'

/** Thrown from route helpers; the error middleware turns it into `{ message }` with this status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Validates a request body, throwing a 400 with the first issue as a readable message. */
export function parseBody<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data ?? {})
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.')
    throw new HttpError(400, issue ? (path ? `${path}: ${issue.message}` : issue.message) : 'Invalid request')
  }
  return result.data
}
