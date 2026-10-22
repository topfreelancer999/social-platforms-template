const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Message text with `@Name` / `@All` mentions highlighted in WeChat link blue. */
export function MentionText({ content, names, all }: { content: string; names: string[]; all?: boolean }) {
  const tokens = [...new Set([...(all ? ['All'] : []), ...names.filter(Boolean)])].sort((a, b) => b.length - a.length)
  if (!tokens.length || !content.includes('@')) return <>{content}</>
  const re = new RegExp(`(@(?:${tokens.map(escape).join('|')}))`, 'g')
  return (
    <>
      {content.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-[#576b95] font-medium">{part}</span>
        ) : (
          part
        ),
      )}
    </>
  )
}
