import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { rel } from '@/lib/format'
import { PageHeader } from './PageHeader'
import { canManage, type GroupChat, useGroupChat, usePostNotice } from './api'

/** View the Group Notice; the owner and admins can post a new one. */
export function GroupNoticePage() {
  const { threadId } = useParams()
  const { data, isLoading, isError, error } = useGroupChat(threadId)

  if (isLoading) return <p className="p-4 text-sm text-wx-muted">Loading…</p>
  if (isError || !data) {
    return (
      <div className="h-full flex flex-col bg-wx-bg">
        <PageHeader back="/" title="Group Notice" />
        <p className="p-4 text-sm text-red-500">{error?.message ?? 'Group chat not found'}</p>
      </div>
    )
  }
  return <Notice key={data.announcement?.updatedAt ?? 'none'} group={data} />
}

function Notice({ group }: { group: GroupChat }) {
  const [draft, setDraft] = useState<string | null>(null)
  const post = usePostNotice(group.id)
  const mayEdit = canManage(group.me.role)
  const notice = group.announcement

  const submit = () => {
    if (!draft?.trim()) return
    if (!window.confirm('This notice will be sent to all members with @All. Post it?')) return
    post.mutate(draft.trim(), { onSuccess: () => setDraft(null) })
  }

  return (
    <div className="h-full flex flex-col bg-wx-panel">
      <PageHeader
        back={`/group-chat/${group.id}/info`}
        title="Group Notice"
        right={
          mayEdit &&
          (draft === null ? (
            <button type="button" onClick={() => setDraft(notice?.content ?? '')} className="text-sm text-wx-text">
              Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={!draft.trim() || post.isPending}
              className="text-sm bg-wx-green text-white rounded px-3 py-1 disabled:opacity-50"
            >
              {post.isPending ? 'Posting…' : 'Post'}
            </button>
          ))
        }
      />
      <div className="flex-1 overflow-y-auto p-4">
        {post.isError && <p className="mb-3 text-sm text-red-500">{post.error.message}</p>}
        {draft !== null ? (
          <textarea
            autoFocus
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a notice for all group members"
            className="w-full h-60 bg-wx-bg rounded-md p-3 text-[15px] outline-none resize-none"
          />
        ) : notice ? (
          <article>
            {notice.by && (
              <div className="flex items-center gap-3 pb-3 mb-3 border-b border-wx-border">
                <img src={notice.by.avatarUrl} alt="" className="w-10 h-10 rounded-md" />
                <div>
                  <p className="font-medium text-sm">{notice.by.name}</p>
                  {notice.updatedAt && <p className="text-xs text-wx-muted">{rel(notice.updatedAt)}</p>}
                </div>
              </div>
            )}
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{notice.content}</p>
          </article>
        ) : (
          <div className="text-center text-wx-muted py-16">
            <Megaphone size={36} className="mx-auto mb-3 text-[#b2b2b2]" />
            <p className="text-sm">No Group Notice yet</p>
          </div>
        )}
        {!mayEdit && (
          <p className="mt-8 text-center text-xs text-wx-muted">Only the group owner and admins can edit the Group Notice</p>
        )}
      </div>
    </div>
  )
}
