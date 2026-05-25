import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useUIStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

const schema = z.object({ email: z.string().email() })

export function ForgotPasswordPage() {
  const showToast = useUIStore((s) => s.showToast)
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: (data: { email: string }) =>
      api('/auth/forgot-password', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => showToast('Reset link sent to your email (mock)'),
  })

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-2xl font-semibold mb-2">Reset password</h1>
      <p className="text-sm text-linkedin-muted mb-6">
        Enter your email and we&apos;ll send a reset link (demo — no email sent).
      </p>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link to="/login" className="text-linkedin-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </Card>
  )
}
