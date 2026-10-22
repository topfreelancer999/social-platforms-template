import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { WeChatLayout } from '@/components/layout/WeChatLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ChatsPage } from '@/features/chats/ChatsPage'
import { ChatPage } from '@/features/chats/ChatPage'
import { MomentsPage } from '@/features/moments/MomentsPage'
import { PostMomentPage } from '@/features/moments/PostMomentPage'
import { UserMomentsPage } from '@/features/moments/UserMomentsPage'
import { MomentDetailPage } from '@/features/moments/MomentDetailPage'
import { DiscoverPage } from '@/features/discover/DiscoverPage'
import { MePage } from '@/features/me/MePage'
import { ChannelsPage } from '@/features/channels/ChannelsPage'
import { ChannelDetailPage } from '@/features/channels/ChannelDetailPage'
import { ContactsPage } from '@/features/contacts/ContactsPage'
import { NewChatPage } from '@/features/contacts/NewChatPage'
import { TagsPage } from '@/features/contacts/TagsPage'
import { TagEditPage } from '@/features/contacts/TagEditPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { ProfileEditPage } from '@/features/profile/ProfileEditPage'
import { SearchPage } from '@/features/search/SearchPage'
import { GroupsPage } from '@/features/groups/GroupsPage'
import { GroupDetailPage } from '@/features/groups/GroupDetailPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { PageDetailPage } from '@/features/pages/PageDetailPage'
import { FeedbackPage } from '@/features/feedback/FeedbackPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { EventsPage } from '@/features/events/EventsPage'
import { GroupInfoPage } from '@/features/group-chats/GroupInfoPage'
import { GroupNoticePage } from '@/features/group-chats/GroupNoticePage'
import { GroupQrPage } from '@/features/group-chats/GroupQrPage'
import { GroupAddMembersPage } from '@/features/group-chats/GroupAddMembersPage'
import { GroupManagePage } from '@/features/group-chats/GroupManagePage'
import { JoinGroupPage } from '@/features/group-chats/JoinGroupPage'

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

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Public><LoginPage /></Public>} />
        <Route path="/register" element={<Public><RegisterPage /></Public>} />
      </Route>
      <Route element={<Private><WeChatLayout /></Private>}>
        <Route index element={<ChatsPage />} />
        <Route path="chat/:threadId" element={<ChatPage />} />
        <Route path="group-chat/join/:token?" element={<JoinGroupPage />} />
        <Route path="group-chat/:threadId/info" element={<GroupInfoPage />} />
        <Route path="group-chat/:threadId/notice" element={<GroupNoticePage />} />
        <Route path="group-chat/:threadId/qr" element={<GroupQrPage />} />
        <Route path="group-chat/:threadId/add" element={<GroupAddMembersPage />} />
        <Route path="group-chat/:threadId/manage" element={<GroupManagePage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/new" element={<NewChatPage />} />
        <Route path="contacts/tags" element={<TagsPage />} />
        <Route path="contacts/tags/new" element={<TagEditPage />} />
        <Route path="contacts/tags/:id" element={<TagEditPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="moments" element={<MomentsPage />} />
        <Route path="moments/post" element={<PostMomentPage />} />
        <Route path="moments/user/:username" element={<UserMomentsPage />} />
        <Route path="moments/:id" element={<MomentDetailPage />} />
        <Route path="me" element={<MePage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="channels/:slug" element={<ChannelDetailPage />} />
        <Route path="search" element={<SearchPage />} />
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
