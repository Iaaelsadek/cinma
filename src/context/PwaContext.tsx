import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaContextType {
  isSupported: boolean
  isInstalled: boolean
  install: () => Promise<void>
  dismiss: () => void
}

const PwaContext = createContext<PwaContextType | undefined>(undefined)

const STORAGE_KEY = 'cinma_pwa_install_dismissed'

export const PwaProvider = ({ children }: { children: ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    
    if (isStandalone) {
      setIsInstalled(true)
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      console.log('PWA Install Prompt Captured')
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    setDeferredPrompt(null)
    sessionStorage.setItem(STORAGE_KEY, '1')
  }

  return (
    <PwaContext.Provider value={{ isSupported: !!deferredPrompt, isInstalled, install, dismiss }}>
      {children}
    </PwaContext.Provider>
  )
}

export const usePwa = () => {
  const context = useContext(PwaContext)
  if (context === undefined) {
    throw new Error('usePwa must be used within a PwaProvider')
  }
  return context
}
