import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

/** WeChat sub-page header: back chevron, centred title, optional right action. */
export function PageHeader({ back, title, right }: { back: string; title: string; right?: React.ReactNode }) {
  return (
    <header className="h-11 flex items-center justify-center bg-wx-header border-b border-wx-border shrink-0 relative px-12">
      <Link to={back} className="absolute left-2 p-1 text-wx-text" aria-label="Back">
        <ChevronLeft size={24} />
      </Link>
      <h1 className="font-medium truncate">{title}</h1>
      {right && <div className="absolute right-3">{right}</div>}
    </header>
  )
}
