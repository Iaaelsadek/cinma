import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ShareButtonProps {
  title: string
  url?: string
  text?: string
  className?: string
  size?: 'sm' | 'md'
}

export const ShareButton = ({ title, url, text, className = '', size = 'md' }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false)

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '')
  const shareText = text || `${title} - شاهد على سينما أونلاين`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl
        })
        toast.success('تم المشاركة بنجاح')
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await copyToClipboard()
        }
      }
    } else {
      await copyToClipboard()
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('تم نسخ الرابط')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('فشل النسخ')
    }
  }

  const isSm = size === 'sm'

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10 transition-all ${className}`}
      title="مشاركة"
    >
      {copied ? <Check size={isSm ? 14 : 18} className="text-emerald-400" /> : <Share2 size={isSm ? 14 : 18} />}
      <span>{copied ? 'تم النسخ' : 'مشاركة'}</span>
    </button>
  )
}
