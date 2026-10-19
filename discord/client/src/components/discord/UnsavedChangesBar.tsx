/** Sticky "Careful — you have unsaved changes!" bar shown while a draft differs. */
export function UnsavedChangesBar({
  onReset,
  onSave,
  saving,
  error,
}: {
  onReset: () => void
  onSave: () => void
  saving?: boolean
  error?: string | null
}) {
  return (
    <div className="sticky bottom-3 mt-6 z-10">
      <div className="bg-dc-rail rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-2 shadow-xl">
        <p className="text-sm flex-1 min-w-[10rem]">
          {error ? <span className="text-red-400">{error}</span> : 'Careful — you have unsaved changes!'}
        </p>
        <button type="button" onClick={onReset} className="text-sm px-3 py-1.5 hover:underline">
          Reset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="text-sm font-medium px-4 py-1.5 rounded bg-dc-green text-white hover:bg-[#1a8b4c] disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
