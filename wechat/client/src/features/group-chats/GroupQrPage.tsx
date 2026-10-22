import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toDataURL } from 'qrcode'
import { GroupAvatar } from './GroupAvatar'
import { PageHeader } from './PageHeader'
import { inviteUrl, useGroupChat, useGroupInvite } from './api'

/** Group QR Code: generated locally from a 7-day invite link. */
export function GroupQrPage() {
  const { threadId } = useParams()
  const group = useGroupChat(threadId)
  const invite = useGroupInvite(threadId)
  const url = invite.data ? inviteUrl(invite.data.token) : ''
  const qr = useQuery({
    queryKey: ['group-qr', url],
    queryFn: () => toDataURL(url, { width: 480, margin: 1, color: { dark: '#191919', light: '#ffffff' } }),
    enabled: !!url,
    staleTime: Infinity,
  })
  const [copied, setCopied] = useState(false)

  const copy = () =>
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      },
      () => window.prompt('Copy the invite link', url),
    )

  const error = group.error ?? invite.error ?? qr.error

  return (
    <div className="h-full flex flex-col bg-[#2e2e2e]">
      <PageHeader back={`/group-chat/${threadId}/info`} title="Group QR Code" />
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="bg-wx-panel rounded-lg max-w-sm mx-auto p-6">
          {error ? (
            <p className="text-sm text-red-500 text-center py-12">{error.message}</p>
          ) : !group.data || !qr.data || !invite.data ? (
            <p className="text-sm text-wx-muted text-center py-24">Generating QR code…</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <GroupAvatar avatars={group.data.members.map((m) => m.avatarUrl)} className="w-12 h-12" />
                <p className="font-medium truncate">
                  {group.data.title} ({group.data.memberCount})
                </p>
              </div>
              <img src={qr.data} alt="Group QR code" className="w-full aspect-square mt-6" />
              <p className="mt-4 text-xs text-wx-muted text-center">
                This QR code is valid for 7 days (until {new Date(invite.data.expiresAt).toLocaleDateString()}) and will be
                updated after that.
              </p>
            </>
          )}
        </div>
        {invite.data && (
          <div className="max-w-sm mx-auto mt-4 space-y-2">
            <p className="text-xs text-[#b2b2b2] break-all text-center">{url}</p>
            <button
              type="button"
              onClick={copy}
              className="w-full bg-wx-green text-white rounded-md py-2.5 text-sm font-medium"
            >
              {copied ? 'Copied' : 'Copy Invite Link'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
