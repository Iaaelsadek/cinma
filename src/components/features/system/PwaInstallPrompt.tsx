import { useState, useEffect } from 'react'
import { X, Smartphone, Download } from 'lucide-react'
import { useLang } from '../../../state/useLang'

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const STORAGE_KEY = 'cinma_pwa_install_dismissed'

export const PwaInstallPrompt = () => {
  const { lang } = useLang()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [show, setShow] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY)
    if (dismissed === '1') return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Standalone = already installed (PWA opened as app)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
    if (isStandalone) setInstalled(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setShow(false)
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShow(false)
    sessionStorage.setItem(STORAGE_KEY, '1')
  }

  if (!show || installed) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[200] rounded-2xl border border-lumen-muted bg-lumen-surface/95 backdrop-blur-xl shadow-2xl p-4 animate-in slide-in-from-bottom-4"
      role="dialog"
      aria-label={lang === 'ar' ? 'تثبيت التطبيق' : 'Install app'}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lumen-gold/20 text-lumen-gold">
          <Smartphone size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lumen-cream">
            {lang === 'ar' ? 'نزّل التطبيق' : 'Install the app'}
          </h3>
          <p className="mt-1 text-sm text-lumen-silver">
            {lang === 'ar'
              ? 'افتح أونلاين سينما كتطبيق ووفر المساحة. يعمل أوفلاين للصفحات السابقة.'
              : 'Open Online Cinema as an app and save to home screen. Works offline for visited pages.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-2 rounded-xl bg-lumen-gold px-4 py-2 text-sm font-bold text-lumen-void hover:brightness-110 transition"
            >
              <Download size={16} />
              {lang === 'ar' ? 'تثبيت' : 'Install'}
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-xl border border-lumen-muted px-4 py-2 text-sm font-medium text-lumen-silver hover:bg-lumen-muted/50 transition"
            >
              {lang === 'ar' ? 'لاحقاً' : 'Later'}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-lumen-silver hover:bg-lumen-muted/50 hover:text-lumen-cream transition"
          aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
