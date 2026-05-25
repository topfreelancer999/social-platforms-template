import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'

const promoted = [
  { title: 'SalesPro CRM', desc: 'Transform your pipeline', img: 'https://picsum.photos/seed/ad1/64/64' },
  { title: 'CloudNine Hosting', desc: 'Deploy in minutes', img: 'https://picsum.photos/seed/ad2/64/64' },
]

const news = [
  'Tech hiring rebounds in Q2',
  'Remote work policies evolve',
  'AI tools reshape product teams',
]

export function RightRail() {
  return (
    <aside className="hidden xl:block w-[300px] shrink-0 space-y-2">
      <Card>
        <h3 className="text-sm font-semibold mb-3">LinkedIn News</h3>
        <ul className="space-y-2">
          {news.map((item, i) => (
            <li key={item} className="text-sm">
              <span className="text-linkedin-muted text-xs">{i + 1} · </span>
              <button className="hover:text-linkedin-primary hover:underline text-left">
                {item}
              </button>
            </li>
          ))}
        </ul>
      </Card>
      {promoted.map((ad) => (
        <Card key={ad.title}>
          <p className="text-[10px] text-linkedin-muted uppercase mb-2">Promoted</p>
          <div className="flex gap-3">
            <img src={ad.img} alt="" className="w-14 h-14 rounded object-cover" />
            <div>
              <p className="font-semibold text-sm">{ad.title}</p>
              <p className="text-xs text-linkedin-muted">{ad.desc}</p>
              <button className="text-xs text-linkedin-muted mt-1 hover:text-linkedin-primary">
                Ad options
              </button>
            </div>
          </div>
        </Card>
      ))}
      <Card className="text-xs text-linkedin-muted space-y-2">
        <div className="flex flex-wrap gap-2">
          {['About', 'Accessibility', 'Help', 'Privacy'].map((l) => (
            <Link key={l} to="#" className="hover:text-linkedin-primary hover:underline">
              {l}
            </Link>
          ))}
        </div>
        <p>LinkedIn Clone © 2026</p>
      </Card>
    </aside>
  )
}
