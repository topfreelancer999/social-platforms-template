import { formatDistanceToNow } from 'date-fns'
export const rel = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })
