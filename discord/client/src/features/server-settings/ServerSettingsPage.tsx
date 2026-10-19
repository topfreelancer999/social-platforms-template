import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SettingsLayout } from '@/components/discord/SettingsLayout'
import { useServer, useServerRealtime } from '@/features/server/hooks'
import { RolesSection } from './RolesSection'
import { MembersSection } from './MembersSection'

export function ServerSettingsPage() {
  const { serverId, section = 'roles' } = useParams()
  const navigate = useNavigate()
  useServerRealtime(serverId)
  const { data: server, isLoading, error } = useServer(serverId)
  const close = useCallback(() => navigate(`/servers/${serverId}`), [navigate, serverId])

  const sections = [
    { id: 'roles', label: 'Roles', to: `/servers/${serverId}/settings/roles` },
    { id: 'members', label: 'Members', to: `/servers/${serverId}/settings/members` },
  ]

  return (
    <SettingsLayout heading={server?.name ?? 'Server Settings'} sections={sections} active={section} onClose={close}>
      {isLoading && <p className="text-dc-muted">Loading server settings…</p>}
      {error && (
        <div className="rounded-lg bg-dc-sidebar p-6 text-center">
          <p className="font-semibold mb-1">Couldn’t load server settings</p>
          <p className="text-sm text-dc-muted">{error.message}</p>
        </div>
      )}
      {server && section === 'members' && <MembersSection server={server} />}
      {server && section !== 'members' && <RolesSection server={server} />}
    </SettingsLayout>
  )
}
