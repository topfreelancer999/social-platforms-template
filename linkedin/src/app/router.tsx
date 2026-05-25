import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { FeedPage } from '@/features/feed/FeedPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProfileEditPage } from '@/features/profile/ProfileEditPage'
import { NetworkPage } from '@/features/network/NetworkPage'
import { SearchPage } from '@/features/search/SearchPage'
import { JobsPage } from '@/features/jobs/JobsPage'
import { JobDetailPage } from '@/features/jobs/JobDetailPage'
import { SavedJobsPage } from '@/features/jobs/SavedJobsPage'
import { MessagingPage } from '@/features/messaging/MessagingPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { CompanyPage } from '@/features/company/CompanyPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { LearningPage } from '@/features/learning/LearningPage'
import { CoursePage } from '@/features/learning/CoursePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { PremiumPage } from '@/features/premium/PremiumPage'
import { EventsPage } from '@/features/events/EventsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { useAuth } from '@/hooks/useAuth'

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnly>
              <RegisterPage />
            </PublicOnly>
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<FeedPage />} />
        <Route path="search/:tab?" element={<SearchPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/saved" element={<SavedJobsPage />} />
        <Route path="jobs/:id" element={<JobDetailPage />} />
        <Route path="mynetwork" element={<NetworkPage />} />
        <Route path="messaging" element={<MessagingPage />} />
        <Route path="messaging/:threadId" element={<MessagingPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="in/:username" element={<ProfilePage />} />
        <Route path="in/:username/edit" element={<ProfileEditPage />} />
        <Route path="company/:slug" element={<CompanyPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="groups/:id" element={<GroupDetailPage />} />
        <Route path="learning" element={<LearningPage />} />
        <Route path="learning/:courseId" element={<CoursePage />} />
        <Route path="premium" element={<PremiumPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="settings/:section?" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
