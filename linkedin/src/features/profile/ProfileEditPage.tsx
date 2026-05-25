import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authHeaders } from '@/hooks/useAuth'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card } from '@/components/ui/Card'

export function ProfileEditPage() {
  const { username } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const token = useAuthStore((s) => s.token)

  const { register, handleSubmit } = useForm({
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      headline: user?.headline ?? '',
      location: user?.location ?? '',
      about: user?.about ?? '',
    },
  })

  const save = useMutation({
    mutationFn: (data: Record<string, string>) =>
      api('/users/me', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      if (token) setAuth(token, updated as typeof user & object)
      navigate(`/in/${username}`)
    },
  })

  return (
    <Card className="max-w-xl">
      <h1 className="text-xl font-semibold mb-6">Edit profile</h1>
      <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" {...register('firstName')} />
          <Input label="Last name" {...register('lastName')} />
        </div>
        <Input label="Headline" {...register('headline')} />
        <Input label="Location" {...register('location')} />
        <Textarea label="About" rows={5} {...register('about')} />
        <div className="flex gap-2">
          <Button type="submit" disabled={save.isPending}>
            Save
          </Button>
          <Button variant="ghost" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
