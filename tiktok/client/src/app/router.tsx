import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { VideoFeedPage } from '@/features/feed/VideoFeedPage'
import { UploadPage } from '@/features/upload/UploadPage'
import { DiscoverPage } from '@/features/discover/DiscoverPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProfileEditPage } from '@/features/profile/ProfileEditPage'
import { VideoDetailPage } from '@/features/feed/VideoDetailPage'
import { ChannelPage } from '@/features/channel/ChannelPage'
import { FriendsPage } from '@/features/friends/FriendsPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { MessagingPage } from '@/features/messaging/MessagingPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { SearchPage } from '@/features/search/SearchPage'
import { PageDetailPage } from '@/features/pages/PageDetailPage'
import { FeedbackPage } from '@/features/feedback/FeedbackPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { EventsPage } from '@/features/events/EventsPage'
import { HashtagPage } from '@/features/discover/HashtagPage'
import { LivePage } from '@/features/live/LivePage'
import { SoundPage } from '@/features/sounds/SoundPage'

function Private({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function Public({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? <Navigate to="/" replace /> : children
}

function ProfileRedirect() {
  const { username } = useParams()
  return <Navigate to={username ? `/@${username}` : '/'} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Public><LoginPage /></Public>} />
        <Route path="/register" element={<Public><RegisterPage /></Public>} />
      </Route>
      <Route path="/" element={<Private><VideoFeedPage key="for-you" tab="for-you" /></Private>} />
      <Route path="/following" element={<Private><VideoFeedPage key="following" tab="following" /></Private>} />
      <Route path="/upload" element={<Private><UploadPage /></Private>} />
      <Route path="/discover" element={<Private><DiscoverPage /></Private>} />
      <Route path="/inbox" element={<Private><MessagingPage /></Private>} />
      <Route path="/inbox/:threadId" element={<Private><MessagingPage /></Private>} />
      <Route path="/@:username" element={<Private><ProfilePage /></Private>} />
      <Route path="/@:username/edit" element={<Private><ProfileEditPage /></Private>} />
      <Route path="/profile/:username" element={<ProfileRedirect />} />
      <Route path="/video/:id" element={<Private><VideoDetailPage /></Private>} />
      <Route path="/hashtag/:tag" element={<HashtagPage />} />
      <Route path="/sound/:id" element={<Private><SoundPage /></Private>} />
      <Route path="/channel" element={<Private><ChannelPage /></Private>} />
      <Route path="/friends" element={<Private><FriendsPage /></Private>} />
      <Route path="/follows" element={<Navigate to="/friends" replace />} />
      <Route path="/groups" element={<Private><GroupsPage /></Private>} />
      <Route path="/groups/:id" element={<Private><GroupDetailPage /></Private>} />
      <Route path="/notifications" element={<Private><NotificationsPage /></Private>} />
      <Route path="/search" element={<Private><SearchPage /></Private>} />
      <Route path="/pages/:slug" element={<PageDetailPage />} />
      <Route path="/feedback" element={<Private><FeedbackPage /></Private>} />
      <Route path="/settings/:section?" element={<Private><SettingsPage /></Private>} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/live" element={<LivePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
