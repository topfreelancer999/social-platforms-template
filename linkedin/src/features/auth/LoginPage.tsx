import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/constants'
import type { AuthResponse } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const login = useMutation({
    mutationFn: (data: FormData) =>
      api<AuthResponse>('/auth/login', {
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
      <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
      <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-4">
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        {login.error && (
          <p className="text-sm text-red-600">{(login.error as Error).message}</p>
        )}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-4 pt-4 border-t">
        <p className="text-sm text-linkedin-muted mb-2">Demo account</p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setValue('email', DEMO_EMAIL)
            setValue('password', DEMO_PASSWORD)
            login.mutate({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
          }}
        >
          Sign in as Jane Doe (demo)
        </Button>
      </div>
      <p className="mt-6 text-center text-sm">
        New to LinkedIn?{' '}
        <Link to="/register" className="text-linkedin-primary font-semibold hover:underline">
          Join now
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link to="/forgot-password" className="text-linkedin-primary hover:underline">
          Forgot password?
        </Link>
      </p>
    </Card>
  )
}
