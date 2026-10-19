import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { DiscordLayout } from '@/components/layout/DiscordLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomeRedirect } from '@/features/app/HomeRedirect'
import { AppPage } from '@/features/app/AppPage'
import { DiscoverPage } from '@/features/discover/DiscoverPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProfileEditPage } from '@/features/profile/ProfileEditPage'
import { ChannelFeedPage } from '@/features/channel/ChannelFeedPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { MessagingPage } from '@/features/messaging/MessagingPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { PageDetailPage } from '@/features/pages/PageDetailPage'
import { FeedbackPage } from '@/features/feedback/FeedbackPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { EventsPage } from '@/features/events/EventsPage'
import { SearchPage } from '@/features/search/SearchPage'
import { ServerSettingsPage } from '@/features/server-settings/ServerSettingsPage'
import { ChannelSettingsPage } from '@/features/channel-settings/ChannelSettingsPage'

function Private({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function Public({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? <Navigate to="/" replace /> : children
}

function ProfileEditRedirect() {
  const { username } = useParams()
  return <Navigate to={`/users/${username}/edit`} replace />
}

function InboxRedirect() {
  const { threadId } = useParams()
  return <Navigate to={`/messages/${threadId}`} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Public><LoginPage /></Public>} />
        <Route path="/register" element={<Public><RegisterPage /></Public>} />
      </Route>
      {/* Settings are full-screen overlays, like Discord's, so they sit outside the app chrome. */}
      <Route path="servers/:serverId/settings/:section?" element={<Private><ServerSettingsPage /></Private>} />
      <Route
        path="servers/:serverId/channels/:channelId/settings/:section?"
        element={<Private><ChannelSettingsPage /></Private>}
      />
      <Route element={<DiscordLayout />}>
        <Route index element={<Private><HomeRedirect /></Private>} />
        <Route path="servers/:serverId" element={<Private><AppPage /></Private>} />
        <Route path="servers/:serverId/channels/:channelId" element={<Private><AppPage /></Private>} />
        <Route path="discover" element={<Private><DiscoverPage /></Private>} />
        <Route path="search" element={<Private><SearchPage /></Private>} />
        <Route path="users/:username" element={<Private><ProfilePage /></Private>} />
        <Route path="users/:username/edit" element={<Private><ProfileEditPage /></Private>} />
        <Route path="profile/:username/edit" element={<ProfileEditRedirect />} />
        <Route path="posts" element={<Private><ChannelFeedPage /></Private>} />
        <Route path="groups" element={<Private><GroupsPage /></Private>} />
        <Route path="groups/:id" element={<Private><GroupDetailPage /></Private>} />
        <Route path="messages" element={<Private><MessagingPage /></Private>} />
        <Route path="messages/:threadId" element={<Private><MessagingPage /></Private>} />
        <Route path="inbox" element={<Navigate to="/messages" replace />} />
        <Route path="inbox/:threadId" element={<InboxRedirect />} />
        <Route path="notifications" element={<Private><NotificationsPage /></Private>} />
        <Route path="pages/:slug" element={<PageDetailPage />} />
        <Route path="feedback" element={<Private><FeedbackPage /></Private>} />
        <Route path="settings/:section?" element={<Private><SettingsPage /></Private>} />
        <Route path="events" element={<EventsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
