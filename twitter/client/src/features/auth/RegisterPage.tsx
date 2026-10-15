import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

const schema = z.object({
  firstName: z.string().min(1), lastName: z.string().min(1),
  email: z.string().email(), password: z.string().min(6),
})

export function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const { register, handleSubmit } = useForm({ resolver: zodResolver(schema) })
  return (
    <Card className="w-full max-w-md p-6">
      <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
      <form onSubmit={handleSubmit(async (d) => {
        const res = await api<{ user: import('@/stores/authStore').User; accessToken: string }>('/auth/register', { method: 'POST', body: JSON.stringify(d) })
        setAuth(res.user, res.accessToken)
        navigate('/')
      })} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input label="First name" {...register('firstName')} />
          <Input label="Last name" {...register('lastName')} />
        </div>
        <Input label="Email" type="email" {...register('email')} />
        <Input label="Password" type="password" {...register('password')} />
        <Button type="submit" className="w-full">Sign Up</Button>
      </form>
      <p className="text-center mt-4 text-sm"><Link to="/login" className="text-fb-primary">Already have an account?</Link></p>
    </Card>
  )
}
