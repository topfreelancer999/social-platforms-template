import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { GroupAvatar } from './GroupAvatar'
import { PageHeader } from './PageHeader'
import { parseInviteToken, useInvitePreview, useJoinGroup } from './api'

/** /group-chat/join/:token shows the group preview; /group-chat/join accepts a pasted invite link. */
export function JoinGroupPage() {
  const { token } = useParams()
  return token ? <JoinPreview key={token} token={token} /> : <PasteLink />
}

function PasteLink() {
  const navigate = useNavigate()
  const [link, setLink] = useState('')
  const [invalid, setInvalid] = useState(false)

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <PageHeader back="/" title="Join Group" />
      <form
        className="p-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          const parsed = parseInviteToken(link)
          if (parsed) navigate(`/group-chat/join/${parsed}`)
          else setInvalid(true)
        }}
      >
        <p className="text-sm text-wx-muted">Paste a group invite link shared from a Group QR Code.</p>
        <div className="flex items-center gap-2 bg-wx-panel rounded-md px-3 border border-wx-border">
          <Link2 size={18} className="text-wx-muted shrink-0" />
          <input
            autoFocus
            value={link}
            onChange={(e) => {
              setLink(e.target.value)
              setInvalid(false)
            }}
            placeholder="https://…/group-chat/join/…"
            className="flex-1 min-w-0 py-2.5 text-sm outline-none bg-transparent"
          />
        </div>
        {invalid && <p className="text-sm text-red-500">That doesn't look like a group invite link.</p>}
        <button
          type="submit"
          disabled={!link.trim()}
          className="w-full bg-wx-green text-white rounded-md py-2.5 text-sm font-medium disabled:opacity-50"
        >
          Continue
        </button>
      </form>
    </div>
  )
}

function JoinPreview({ token }: { token: string }) {
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useInvitePreview(token)
  const join = useJoinGroup()

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <PageHeader back="/group-chat/join" title="Group Invitation" />
      <div className="flex-1 overflow-y-auto px-6 py-10 text-center">
        {isLoading && <p className="text-sm text-wx-muted">Loading group…</p>}
        {isError && (
          <div className="space-y-3">
            <p className="text-red-500">{error.message}</p>
            <button type="button" onClick={() => navigate('/group-chat/join')} className="text-sm text-wx-green">
              Paste another link
            </button>
          </div>
        )}
        {data && (
          <>
            <GroupAvatar avatars={data.avatars} className="w-20 h-20 mx-auto" />
            <p className="mt-4 text-lg font-medium break-words">
              {data.title} ({data.memberCount})
            </p>
            <p className="mt-2 text-sm text-wx-muted flex items-center justify-center gap-2">
              <img src={data.inviter.avatarUrl} alt="" className="w-5 h-5 rounded" />
              Invited by {data.inviter.name}
            </p>
            <p className="mt-1 text-xs text-wx-muted">Valid until {new Date(data.expiresAt).toLocaleDateString()}</p>
            {join.isError && <p className="mt-4 text-sm text-red-500">{join.error.message}</p>}
            <button
              type="button"
              disabled={join.isPending}
              onClick={() =>
                data.isMember
                  ? navigate(`/chat/${data.threadId}`)
                  : join.mutate(token, { onSuccess: (r) => navigate(`/chat/${r.threadId}`) })
              }
              className="mt-8 w-full max-w-xs bg-wx-green text-white rounded-md py-2.5 font-medium disabled:opacity-50"
            >
              {data.isMember ? 'Open Group Chat' : join.isPending ? 'Joining…' : 'Join Group Chat'}
            </button>
            {data.isMember && <p className="mt-2 text-xs text-wx-muted">You are already in this group chat.</p>}
          </>
        )}
      </div>
    </div>
  )
}
