import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const schema = z.object({ email: z.string().email(), password: z.string().min(6) })

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) })
  const login = async (data: z.infer<typeof schema>) => {
    const res = await api<{ user: import('@/stores/authStore').User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    setAuth(res.user, res.accessToken)
    navigate('/')
  }
  return (
    <div className="w-full max-w-md">
      <h1 className="text-4xl font-black mb-8">Sign in to X</h1>
      <form onSubmit={handleSubmit(login)} className="space-y-4">
        <Input label="Email" type="email" {...register('email')} />
        <Input label="Password" type="password" {...register('password')} />
        {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        <Button type="submit" className="w-full rounded-full">Sign in</Button>
      </form>
      <Button
        variant="secondary"
        className="w-full mt-3 rounded-full"
        onClick={() => {
          setValue('email', DEMO_EMAIL)
          setValue('password', DEMO_PASSWORD)
          login({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
        }}
      >
        Demo login (@alex-morgan)
      </Button>
      <p className="text-center mt-6 text-sm text-x-muted">
        Don&apos;t have an account? <Link to="/register" className="text-x-primary hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
