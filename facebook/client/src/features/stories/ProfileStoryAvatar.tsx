import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore, type User } from '@/stores/authStore'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { userStoriesQuery } from './stories'

/** Profile picture that gets a story ring (and opens the viewer) while the person has an active story. */
export function ProfileStoryAvatar({ user }: { user: User }) {
  const token = useAuthStore((s) => s.accessToken)
  const { data } = useQuery(userStoriesQuery(token, user.id))
  const avatar = <Avatar src={user.avatarUrl} size="lg" className="border-4 border-white w-40 h-40" />
  if (!data?.stories.length) return avatar
  return (
    <Link
      to={`/stories/${user.id}`}
      state={{ from: `/profile/${user.username}` }}
      aria-label={`View ${user.firstName}'s story`}
      className={cn('inline-block rounded-full p-1', data.hasUnseen ? 'bg-fb-primary' : 'bg-[#bcc0c4]')}
    >
      {avatar}
    </Link>
  )
}
