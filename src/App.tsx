import React, { Suspense, useEffect } from 'react'
import { Routes } from 'react-router-dom'
import { AdsManager } from './components/features/system/AdsManager'
import { MainLayout } from './components/layout/MainLayout'
import { Toaster } from 'sonner'
import { ToastProvider } from './components/common/ToastProvider'
import { useLang } from './state/useLang'
import { setTmdbLanguage } from './lib/tmdb'
import { useInitAuth } from './hooks/useInitAuth'
import { PwaProvider } from './context/PwaContext'
import { PageLoader } from './components/common/PageLoader'
import { ScrollToTop } from './components/utils/ScrollToTop'
import { LegacyUrlRedirect } from './components/utils/LegacyUrlRedirect'
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

  // Mouse drag to scroll (like touch)
  useEffect(() => {
    let isDown = false
    let startY = 0
    let scrollY = 0

    const onMouseDown = (e: MouseEvent) => {
      // Only left click, ignore clicks on interactive elements
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest('a, button, input, textarea, select, [role="button"], video, iframe')) return
      isDown = true
      startY = e.clientY
      scrollY = window.scrollY
      document.body.style.userSelect = 'none'
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      const delta = startY - e.clientY
      window.scrollTo({ top: scrollY + delta, behavior: 'instant' as ScrollBehavior })
    }

    const onMouseUp = () => {
      isDown = false
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mouseleave', onMouseUp)

    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mouseleave', onMouseUp)
    }
  }, [])

  return (
    <PwaProvider>
      <MainLayout>
        <ScrollToTop />
        <LegacyUrlRedirect />
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
        <Toaster
          richColors
          position="top-center"
          toastOptions={{
            style: {
              zIndex: 999999,
              position: 'fixed',
              top: '20px'
            },
            className: 'toast-fixed'
          }}
        />
        <ToastProvider />
      </MainLayout>
    </PwaProvider>
  )
}

export default App
