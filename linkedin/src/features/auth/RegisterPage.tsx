import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AuthResponse } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  headline: z.string().min(1),
  location: z.string().min(1),
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const registerMutation = useMutation({
    mutationFn: (data: FormData) =>
      api<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (res) => {
      setAuth(res.token, res.user)
      navigate('/')
    },
  })

  return (
    <Card className="w-full max-w-md">
      <h1 className="text-2xl font-semibold mb-6">Join LinkedIn</h1>
      <form
        onSubmit={handleSubmit((d) => registerMutation.mutate(d))}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" error={errors.firstName?.message} {...register('firstName')} />
          <Input label="Last name" error={errors.lastName?.message} {...register('lastName')} />
        </div>
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password (6+ characters)"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input label="Headline" error={errors.headline?.message} {...register('headline')} />
        <Input label="Location" error={errors.location?.message} {...register('location')} />
        {registerMutation.error && (
          <p className="text-sm text-red-600">{(registerMutation.error as Error).message}</p>
        )}
        <p className="text-xs text-linkedin-muted">
          By clicking Agree & Join, you agree to the LinkedIn User Agreement, Privacy Policy, and
          Cookie Policy.
        </p>
        <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
          Agree & Join
        </Button>
      </form>
      <p className="mt-6 text-center text-sm">
        Already on LinkedIn?{' '}
        <Link to="/login" className="text-linkedin-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  )
}
