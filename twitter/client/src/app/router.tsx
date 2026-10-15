import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { AppShell } from '@/components/layout/AppShell'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { FeedPage } from '@/features/feed/FeedPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProfileEditPage } from '@/features/profile/ProfileEditPage'
import { FriendsPage } from '@/features/friends/FriendsPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { MessagingPage } from '@/features/messaging/MessagingPage'
import { SearchPage } from '@/features/search/SearchPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { PageDetailPage } from '@/features/pages/PageDetailPage'
import { FeedbackPage } from '@/features/feedback/FeedbackPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { EventsPage } from '@/features/events/EventsPage'
import { TweetDetailPage } from '@/features/feed/TweetDetailPage'
import { QuotesPage } from '@/features/feed/QuotesPage'
import { HashtagPage } from '@/features/explore/HashtagPage'

function Private({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? children : <Navigate to="/login" replace />
}

function Public({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user ? <Navigate to="/" replace /> : children
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Public><LoginPage /></Public>} />
        <Route path="/register" element={<Public><RegisterPage /></Public>} />
      </Route>
      <Route element={<Private><AppShell /></Private>}>
        <Route index element={<FeedPage />} />
        <Route path="explore" element={<SearchPage />} />
        <Route path="profile/:username" element={<ProfilePage />} />
        <Route path="profile/:username/edit" element={<ProfileEditPage />} />
        <Route path="follows" element={<FriendsPage />} />
        <Route path="communities" element={<GroupsPage />} />
        <Route path="communities/:id" element={<GroupDetailPage />} />
        <Route path="messages" element={<MessagingPage />} />
        <Route path="messages/:threadId" element={<MessagingPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="pages/:slug" element={<PageDetailPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="settings/:section?" element={<SettingsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="tweet/:id" element={<TweetDetailPage />} />
        <Route path="tweet/:id/quotes" element={<QuotesPage />} />
        <Route path="hashtag/:tag" element={<HashtagPage />} />
        <Route path="friends" element={<Navigate to="/follows" replace />} />
        <Route path="groups" element={<Navigate to="/communities" replace />} />
        <Route path="groups/:id" element={<Navigate to="/communities" replace />} />
        <Route path="search" element={<Navigate to="/explore" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
