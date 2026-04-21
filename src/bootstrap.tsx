import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import App from './App'
import './index.css'
import './styles/accessibility.css'
import './styles/quran-player-accessibility.css'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000,      // 15 minutes
      gcTime: 30 * 60 * 1000,         // 30 minutes
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: false,    // Disable refetch on window focus
      refetchOnMount: false,          // Don't refetch if data is fresh
      refetchOnReconnect: false       // Don't refetch on reconnect if data is fresh
    },
    mutations: {
      retry: false,
    },
  },
})

// PWA disabled for now
// registerSW({ immediate: false })

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
