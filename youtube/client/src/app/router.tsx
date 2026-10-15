import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { YouTubeLayout } from '@/components/layout/YouTubeLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/home/HomePage'
import { WatchPage } from '@/features/watch/WatchPage'
import { UploadPage } from '@/features/studio/UploadPage'
import { ChannelPage } from '@/features/channel/ChannelPage'
import { ProfileEditPage } from '@/features/profile/ProfileEditPage'
import { SubscriptionsPage } from '@/features/subscriptions/SubscriptionsPage'
import { SearchPage } from '@/features/search/SearchPage'
import { ChannelFeedPage } from '@/features/channel/ChannelFeedPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { MessagingPage } from '@/features/messaging/MessagingPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { PageDetailPage } from '@/features/pages/PageDetailPage'
import { FeedbackPage } from '@/features/feedback/FeedbackPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { EventsPage } from '@/features/events/EventsPage'
import { PlaylistsPage } from '@/features/playlists/PlaylistsPage'
import { TrendingPage } from '@/features/home/TrendingPage'

function Private({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function Public({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? <Navigate to="/" replace /> : children
}

function ChannelEditRedirect() {
  const { username } = useParams()
  return <Navigate to={`/channel/${username}/edit`} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Public><LoginPage /></Public>} />
        <Route path="/register" element={<Public><RegisterPage /></Public>} />
      </Route>
      <Route element={<YouTubeLayout />}>
        <Route index element={<HomePage />} />
        <Route path="watch/:id" element={<Private><WatchPage /></Private>} />
        <Route path="search" element={<SearchPage />} />
        <Route path="trending" element={<TrendingPage />} />
        <Route path="subscriptions" element={<Private><SubscriptionsPage /></Private>} />
        <Route path="channel/:username" element={<ChannelPage />} />
        <Route path="channel/:username/edit" element={<Private><ProfileEditPage /></Private>} />
        <Route path="profile/:username/edit" element={<ChannelEditRedirect />} />
        <Route path="studio/upload" element={<Private><UploadPage /></Private>} />
        <Route path="channel-feed" element={<Private><ChannelFeedPage /></Private>} />
        <Route path="playlists" element={<Private><PlaylistsPage /></Private>} />
        <Route path="groups" element={<Private><GroupsPage /></Private>} />
        <Route path="groups/:id" element={<Private><GroupDetailPage /></Private>} />
        <Route path="inbox" element={<Private><MessagingPage /></Private>} />
        <Route path="inbox/:threadId" element={<Private><MessagingPage /></Private>} />
        <Route path="notifications" element={<Private><NotificationsPage /></Private>} />
        <Route path="pages/:slug" element={<PageDetailPage />} />
        <Route path="feedback" element={<Private><FeedbackPage /></Private>} />
        <Route path="settings/:section?" element={<Private><SettingsPage /></Private>} />
        <Route path="events" element={<EventsPage />} />
        <Route path="friends" element={<Navigate to="/subscriptions" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
