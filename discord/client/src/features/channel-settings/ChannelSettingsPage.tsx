import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { SettingsLayout } from '@/components/discord/SettingsLayout'
import { P, has } from '@/lib/permissions'
import { useServer, useServerRealtime } from '@/features/server/hooks'
import { ChannelOverviewSection } from './ChannelOverviewSection'
import { ChannelPermissionsSection } from './ChannelPermissionsSection'

export function ChannelSettingsPage() {
  const { serverId, channelId, section } = useParams()
  const navigate = useNavigate()
  useServerRealtime(serverId, channelId)
  const { data: server, isLoading, error } = useServer(serverId)
  const close = useCallback(() => navigate(`/servers/${serverId}/channels/${channelId}`), [navigate, serverId, channelId])

  const channel = server?.channels.find((c) => c.id === channelId)
  const canOverview = has(channel?.permissions, P.MANAGE_CHANNELS)
  const canPermissions = has(channel?.permissions, P.MANAGE_ROLES)
  const active = section ?? (canOverview ? 'overview' : 'permissions')
  const base = `/servers/${serverId}/channels/${channelId}/settings`
  const sections = [
    { id: 'overview', label: 'Overview', to: `${base}/overview`, disabled: !canOverview },
    { id: 'permissions', label: 'Permissions', to: `${base}/permissions`, disabled: !canPermissions },
  ]

  return (
    <SettingsLayout heading={channel ? `# ${channel.name}` : 'Channel Settings'} sections={sections} active={active} onClose={close}>
      {isLoading && <p className="text-dc-muted">Loading channel settings…</p>}
      {(error || (server && !channel)) && (
        <div className="rounded-lg bg-dc-sidebar p-6 text-center">
          <p className="font-semibold mb-1">Channel unavailable</p>
          <p className="text-sm text-dc-muted">{error?.message ?? 'This channel does not exist or you can no longer see it.'}</p>
        </div>
      )}
      {channel && active === 'overview' && <ChannelOverviewSection channel={channel} canEdit={canOverview} />}
      {channel && active === 'permissions' && <ChannelPermissionsSection channelId={channel.id} />}
    </SettingsLayout>
  )
}
