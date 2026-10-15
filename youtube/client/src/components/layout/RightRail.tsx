import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'

const contacts = ['Sarah Kim', 'Mike Jones', 'Emma Wilson', 'David Lee']
const pages = [
  { slug: 'bella-cafe', name: 'Bella Cafe' },
  { slug: 'techstart', name: 'TechStart' },
  { slug: 'fitlife-gym', name: 'FitLife Gym' },
]

export function RightRail() {
  return (
    <aside className="hidden xl:block w-[300px] shrink-0 space-y-4 sticky top-16 self-start">
      <Card className="p-3">
        <h3 className="text-fb-muted font-semibold text-[17px] mb-2">Contacts</h3>
        {contacts.map((c) => (
          <Link key={c} to="/messages" className="flex items-center gap-2 p-2 hover:bg-[#f0f2f5] rounded-lg text-sm">
            <span className="w-2 h-2 rounded-full bg-[#31a24c]" /> {c}
          </Link>
        ))}
      </Card>
      <Card className="p-3">
        <h3 className="text-fb-muted font-semibold text-[17px] mb-2">Pages</h3>
        {pages.map((p) => (
          <Link key={p.slug} to={`/pages/${p.slug}`} className="block p-2 hover:bg-[#f0f2f5] rounded-lg text-sm font-medium">
            {p.name}
          </Link>
        ))}
      </Card>
    </aside>
  )
}
