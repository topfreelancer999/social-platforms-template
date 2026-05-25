import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linkedin-bg p-4">
      <Card className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-linkedin-primary">404</h1>
        <p className="text-linkedin-muted mt-2">This page doesn&apos;t exist.</p>
        <Link to="/" className="inline-block mt-6">
          <Button>Go to feed</Button>
        </Link>
      </Card>
    </div>
  )
}
