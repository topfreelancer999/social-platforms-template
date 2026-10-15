import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, authHeaders } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function CreateListingPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.accessToken)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('USA')
  const [price, setPrice] = useState('100')
  const create = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/listings', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          title,
          description,
          city,
          country,
          pricePerNight: Number(price),
        }),
      }),
    onSuccess: (res) => navigate(`/listing/${res.id}`),
  })
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-6">Create a listing</h1>
      <div className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="block text-sm font-medium text-ab-muted">Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-ab-border rounded-lg p-3 mt-1 text-sm min-h-[100px]" /></label>
        <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
        <Input label="Price per night ($)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        <Button className="w-full rounded-lg" disabled={!title || !city || create.isPending} onClick={() => create.mutate()}>Publish</Button>
      </div>
    </div>
  )
}
