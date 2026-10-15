import { Link } from 'react-router-dom'
import { displayName, useContacts, useUpdateContactMoments } from '@/features/contacts/api'
import { RANGE_LABELS, type MomentsRange } from '@/features/moments/api'

type Flag = 'blockMyMoments' | 'hideTheirMoments'

const LISTS: { flag: Flag; label: string; hint: string }[] = [
  { flag: 'blockMyMoments', label: "Don't let them see my Moments", hint: 'They will not see any of your Moments.' },
  { flag: 'hideTheirMoments', label: 'Hide their Moments', hint: 'Their posts will not appear in your Moments feed.' },
]

/** Settings → Privacy → Moments. */
export function MomentsPrivacySettings({ range, onRangeChange }: { range: string; onRangeChange: (r: MomentsRange) => void }) {
  const { data, isLoading, isError } = useContacts()
  const update = useUpdateContactMoments()
  const contacts = data?.contacts ?? []

  return (
    <section className="mt-6 border-t border-wx-border pt-4">
      <h2 className="font-semibold mb-2">Moments</h2>
      <label className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
        Allow friends to view
        <select
          value={range}
          onChange={(e) => onRangeChange(e.target.value as MomentsRange)}
          className="border rounded px-2 py-1"
        >
          {(Object.keys(RANGE_LABELS) as MomentsRange[]).map((r) => (
            <option key={r} value={r}>{RANGE_LABELS[r]}</option>
          ))}
        </select>
      </label>
      <p className="text-xs text-wx-muted mb-3">
        Friends only see your Moments posted within this range. Choose who sees each post when you publish it; manage
        groups in <Link to="/contacts/tags" className="text-wx-green">Contacts → Tags</Link>.
      </p>
      {isLoading && <p className="text-sm text-wx-muted">Loading contacts…</p>}
      {isError && <p className="text-sm text-red-500">Could not load contacts.</p>}
      {LISTS.map(({ flag, label, hint }) => {
        const count = contacts.filter((c) => c[flag]).length
        return (
          <details key={flag} className="py-2 border-b border-wx-border text-sm">
            <summary className="cursor-pointer flex justify-between gap-2">
              <span>{label}</span>
              <span className="text-wx-muted">{count}</span>
            </summary>
            <p className="text-xs text-wx-muted mt-1 mb-2">{hint}</p>
            {contacts.length === 0 && !isLoading && <p className="text-xs text-wx-muted">No contacts yet.</p>}
            {contacts.map((c) => (
              <label key={c.id} className="flex items-center gap-3 py-1.5">
                <input
                  type="checkbox"
                  checked={c[flag]}
                  disabled={update.isPending}
                  onChange={(e) => update.mutate({ userId: c.id, [flag]: e.target.checked })}
                  className="accent-wx-green"
                />
                <img src={c.avatarUrl} alt="" className="w-7 h-7 rounded" />
                <span>{displayName(c)}</span>
              </label>
            ))}
          </details>
        )
      })}
      {update.isError && <p className="text-xs text-red-500 mt-2">{update.error.message}</p>}
    </section>
  )
}
