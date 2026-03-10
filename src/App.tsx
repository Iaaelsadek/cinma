import React, { Suspense, useEffect } from 'react'
import { Routes } from 'react-router-dom'
import { AdsManager } from './components/features/system/AdsManager'
import { MainLayout } from './components/layout/MainLayout'
import { Toaster } from 'sonner'
import { useLang } from './state/useLang'
import { setTmdbLanguage } from './lib/tmdb'
import { useInitAuth } from './hooks/useInitAuth'
import { PwaProvider } from './context/PwaContext'
import { PageLoader } from './components/common/PageLoader'
import { ScrollToTop } from './components/utils/ScrollToTop'
import { NetworkStatus } from './components/features/system/NetworkStatus'
import { MainRoutes } from './routes/MainRoutes'
import { MediaRoutes } from './routes/MediaRoutes'
import { DiscoveryRoutes } from './routes/DiscoveryRoutes'
import { UserRoutes } from './routes/UserRoutes'
import { AdminRoutes } from './routes/AdminRoutes'

const App = () => {
  useInitAuth()
  const { lang } = useLang()

  useEffect(() => {
    const html = document.documentElement
    html.dir = lang === 'ar' ? 'rtl' : 'ltr'
    html.lang = lang === 'ar' ? 'ar' : 'en'
    setTmdbLanguage(lang === 'ar' ? 'ar-SA' : 'en-US')
  }, [lang])

  return (
    <PwaProvider>
      <MainLayout>
        <ScrollToTop />
        <NetworkStatus />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {MainRoutes()}
            {MediaRoutes()}
            {DiscoveryRoutes()}
            {UserRoutes()}
            {AdminRoutes()}
          </Routes>
        </Suspense>
        <AdsManager type="popunder" position="global" />
        <Toaster richColors position="top-center" toastOptions={{ style: { zIndex: 999999 } }} />
      </MainLayout>
    </PwaProvider>
  )
}

export default App
