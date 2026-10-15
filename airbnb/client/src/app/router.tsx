import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { AppShell } from '@/components/layout/AppShell'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { HomePage } from '@/features/home/HomePage'
import { FeedPage } from '@/features/feed/FeedPage'
import { ListingDetailPage } from '@/features/listings/ListingDetailPage'
import { SearchPage } from '@/features/listings/SearchPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProfileEditPage } from '@/features/profile/ProfileEditPage'
import { FriendsPage } from '@/features/friends/FriendsPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { MessagingPage } from '@/features/messaging/MessagingPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { PageDetailPage } from '@/features/pages/PageDetailPage'
import { FeedbackPage } from '@/features/feedback/FeedbackPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { EventsPage } from '@/features/events/EventsPage'
import { TripsPage } from '@/features/trips/TripsPage'
import { HostPage } from '@/features/host/HostPage'
import { CreateListingPage } from '@/features/host/CreateListingPage'
import { WishlistsPage } from '@/features/wishlists/WishlistsPage'

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
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="listing/:id" element={<ListingDetailPage />} />
        <Route path="feed" element={<Private><FeedPage /></Private>} />
        <Route path="trips" element={<Private><TripsPage /></Private>} />
        <Route path="host" element={<Private><HostPage /></Private>} />
        <Route path="host/listing/new" element={<Private><CreateListingPage /></Private>} />
        <Route path="wishlists" element={<Private><WishlistsPage /></Private>} />
        <Route path="profile/:username" element={<ProfilePage />} />
        <Route path="profile/:username/edit" element={<Private><ProfileEditPage /></Private>} />
        <Route path="friends" element={<Private><FriendsPage /></Private>} />
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
