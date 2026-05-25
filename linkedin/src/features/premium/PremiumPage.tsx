import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Premium Career',
    price: '$29.99/mo',
    features: ['InMail credits', 'Who viewed your profile', 'Applicant insights'],
  },
  {
    name: 'Premium Business',
    price: '$59.99/mo',
    features: ['Unlimited people browsing', 'Business insights', 'LinkedIn Learning'],
    popular: true,
  },
  {
    name: 'Sales Navigator',
    price: '$99.99/mo',
    features: ['Lead recommendations', 'Advanced search', 'CRM sync'],
  },
]

export function PremiumPage() {
  return (
    <div className="max-w-[900px] space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Upgrade to Premium</h1>
        <p className="text-linkedin-muted mt-2">
          Get exclusive tools to grow your career (demo — no payment)
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.popular ? 'border-2 border-linkedin-primary' : ''}
          >
            {plan.popular && (
              <span className="text-xs font-semibold text-linkedin-primary">Most popular</span>
            )}
            <h2 className="font-semibold text-lg mt-2">{plan.name}</h2>
            <p className="text-2xl font-bold my-4">{plan.price}</p>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2 text-sm">
                  <Check size={16} className="text-linkedin-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" variant={plan.popular ? 'primary' : 'outline'}>
              Try 1 month free
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}
