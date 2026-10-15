import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { api, authHeaders } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'

export function ProfileEditPage() {
  const { username } = useParams()
  const { user, accessToken, setAuth } = useAuthStore()
  const navigate = useNavigate()
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const updated = await api<import('@/stores/authStore').User>('/users/me', {
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        firstName: fd.get('firstName'), lastName: fd.get('lastName'),
        bio: fd.get('bio'), location: fd.get('location'), workplace: fd.get('workplace'),
      }),
    })
    setAuth(updated, accessToken!)
    navigate(`/profile/${username}`)
  }
  return (
    <Card className="p-6 max-w-lg">
      <h1 className="text-xl font-bold mb-4">Edit profile</h1>
      <form onSubmit={save} className="space-y-3">
        <Input name="firstName" label="First name" defaultValue={user?.firstName} />
        <Input name="lastName" label="Last name" defaultValue={user?.lastName} />
        <Input name="bio" label="Bio" defaultValue={user?.bio} />
        <Input name="location" label="Location" defaultValue={user?.location} />
        <Input name="workplace" label="Workplace" defaultValue={user?.workplace} />
        <Button type="submit">Save</Button>
      </form>
    </Card>
  )
}
