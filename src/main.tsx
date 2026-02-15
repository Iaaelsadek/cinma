import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'
import { registerSW } from 'virtual:pwa-register'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const queryClient = new QueryClient()
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
)
