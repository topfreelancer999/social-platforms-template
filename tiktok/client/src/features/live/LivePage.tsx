import { Link } from 'react-router-dom'

export function LivePage() {
  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-2xl font-bold">Go Live</h1>
      <p className="text-tt-muted mt-2">Live streaming is a placeholder in this demo.</p>
      <Link to="/" className="mt-6 text-tt-secondary font-semibold">Back to feed</Link>
    </div>
  )
}
