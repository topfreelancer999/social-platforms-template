import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { SnapchatLayout } from '@/components/layout/SnapchatLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/home/HomePage'
import { CameraPage } from '@/features/camera/CameraPage'
import { DiscoverPage } from '@/features/discover/DiscoverPage'
import { MapPage } from '@/features/map/MapPage'
import { StoryViewerPage } from '@/features/story/StoryViewerPage'
import { ChannelPage } from '@/features/channels/ChannelPage'
import { FriendsPage } from '@/features/friends/FriendsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProfileEditPage } from '@/features/profile/ProfileEditPage'
import { SearchPage } from '@/features/search/SearchPage'
import { ChatsPage } from '@/features/messages/ChatsPage'
import { ChatPage } from '@/features/messages/ChatPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { PageDetailPage } from '@/features/pages/PageDetailPage'
import { FeedbackPage } from '@/features/feedback/FeedbackPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { EventsPage } from '@/features/events/EventsPage'
import { SendSnapPage } from '@/features/snaps/SendSnapPage'

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
  return <Navigate to={`/profile/${username}/edit`} replace />
}

function MyProfile() {
  const user = useAuthStore((s) => s.user)
  return user ? <Navigate to={`/profile/${user.username}`} replace /> : null
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Public><LoginPage /></Public>} />
        <Route path="/register" element={<Public><RegisterPage /></Public>} />
      </Route>
      <Route element={<Private><SnapchatLayout /></Private>}>
        <Route index element={<HomePage />} />
        <Route path="camera" element={<CameraPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="chat" element={<ChatsPage />} />
        <Route path="chat/:threadId" element={<ChatPage />} />
        <Route path="snap/new" element={<SendSnapPage />} />
        <Route path="story/:username" element={<StoryViewerPage />} />
        <Route path="channels/:slug" element={<ChannelPage />} />
        <Route path="friends" element={<FriendsPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="profile/:username" element={<ProfilePage />} />
        <Route path="profile/:username/edit" element={<ProfileEditPage />} />
        <Route path="users/:username/edit" element={<ProfileEditRedirect />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="groups/:id" element={<GroupDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="pages/:slug" element={<PageDetailPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="settings/:section?" element={<SettingsPage />} />
        <Route path="events" element={<EventsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
