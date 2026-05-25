import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { bootstrapAuth } from './app/bootstrap'

bootstrapAuth()

async function enableMocking() {
  // Set VITE_USE_REAL_API=true in .env to use the Go backend instead of MSW
  if (import.meta.env.VITE_USE_REAL_API === 'true') return
  if (import.meta.env.MODE !== 'development') return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
