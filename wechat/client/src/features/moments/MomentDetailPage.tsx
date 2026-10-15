import { Link, useNavigate, useParams } from 'react-router-dom'
import { MomentCard } from './MomentCard'
import { useMoment } from './api'

export function MomentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading, isError } = useMoment(id)

  return (
    <div className="h-full flex flex-col bg-wx-bg">
      <header className="h-11 flex items-center justify-center bg-wx-panel border-b border-wx-border shrink-0 relative">
        <button type="button" onClick={() => navigate(-1)} className="absolute left-3 text-sm">←</button>
        <h1 className="font-medium">Details</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="p-4 text-sm text-wx-muted text-center">Loading…</p>}
        {isError && (
          <div className="p-8 text-center text-sm text-wx-muted">
            <p>This Moment is unavailable.</p>
            <Link to="/moments" className="text-wx-green">Back to Moments</Link>
          </div>
        )}
        {data && <MomentCard moment={data} onDeleted={() => navigate('/moments')} />}
      </div>
    </div>
  )
}
