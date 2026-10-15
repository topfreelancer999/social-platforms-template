import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { InstagramLayout } from '@/components/layout/InstagramLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/home/HomePage'
import { ExplorePage } from '@/features/explore/ExplorePage'
import { CreatePostPage } from '@/features/create/CreatePostPage'
import { ReelsPage } from '@/features/reels/ReelsPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProfileEditPage } from '@/features/profile/ProfileEditPage'
import { PostDetailPage } from '@/features/post/PostDetailPage'
import { StoryViewPage } from '@/features/stories/StoryViewPage'
import { SearchPage } from '@/features/search/SearchPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { MessagingPage } from '@/features/messaging/MessagingPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { PageDetailPage } from '@/features/pages/PageDetailPage'
import { FeedbackPage } from '@/features/feedback/FeedbackPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { EventsPage } from '@/features/events/EventsPage'

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

function UserProfileRedirect() {
  const { username } = useParams()
  return <Navigate to={`/profile/${username}`} replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Public><LoginPage /></Public>} />
        <Route path="/register" element={<Public><RegisterPage /></Public>} />
      </Route>
      <Route element={<InstagramLayout />}>
        <Route index element={<Private><HomePage /></Private>} />
        <Route path="explore" element={<Private><ExplorePage /></Private>} />
        <Route path="create" element={<Private><CreatePostPage /></Private>} />
        <Route path="create/story" element={<Private><CreatePostPage /></Private>} />
        <Route path="reels" element={<Private><ReelsPage /></Private>} />
        <Route path="search" element={<Private><SearchPage /></Private>} />
        <Route path="profile/:username" element={<Private><ProfilePage /></Private>} />
        <Route path="profile/:username/edit" element={<Private><ProfileEditPage /></Private>} />
        <Route path="users/:username" element={<UserProfileRedirect />} />
        <Route path="users/:username/edit" element={<ProfileEditRedirect />} />
        <Route path="p/:id" element={<Private><PostDetailPage /></Private>} />
        <Route path="stories/:username" element={<Private><StoryViewPage /></Private>} />
        <Route path="groups" element={<Private><GroupsPage /></Private>} />
        <Route path="groups/:id" element={<Private><GroupDetailPage /></Private>} />
        <Route path="messages" element={<Private><MessagingPage /></Private>} />
        <Route path="messages/:threadId" element={<Private><MessagingPage /></Private>} />
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
