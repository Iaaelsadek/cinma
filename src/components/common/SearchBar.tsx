import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDebounce } from '../../hooks/useDebounce'
import { Input, InputSize } from './Input'
import { Mic, Loader2, Search } from 'lucide-react'
import { useLang } from '../../state/useLang'

type SearchBarProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  placeholder?: string
  className?: string
  size?: InputSize
  onQueryChange?: (value: string) => void
}

export const SearchBar = ({ placeholder, className, size = 'md', onQueryChange, ...props }: SearchBarProps) => {
  const [q, setQ] = useState('')
  const [isListening, setIsListening] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const debounced = useDebounce(q, 400)
  const { lang } = useLang()

  useEffect(() => {
    // Only trigger parent update, do NOT auto-navigate
    if (debounced.trim().length > 1) {
      onQueryChange?.(debounced.trim())
    }
  }, [debounced, onQueryChange])

  const handleSearch = () => {
    if (q.trim().length > 0) {
      onQueryChange?.(q.trim())
      const url = `/search?q=${encodeURIComponent(q.trim())}`
      navigate(url, { replace: false })
    }
  }

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setQ(text);
        // User must press search button manually
      };

      recognition.start();
    } else {
      alert('Voice search is not supported in this browser.');
    }
  }

  return (
    <div className={`relative w-full ${className || ''}`}>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        placeholder={isListening ? (lang === 'ar' ? 'تحدث الآن...' : 'Listening...') : (placeholder || 'ابحث عن فيلم...')}
        size={size}
        // Adjust padding to accommodate both icons (Mic + Search)
        // LTR: padding-right for icons on right. RTL: padding-left for icons on left.
        className="w-full pr-24 rtl:pr-4 rtl:pl-24"
        {...props}
      />
      
      <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-2 ${lang === 'ar' ? 'left-3' : 'right-3'}`}>
        <button
          type="button"
          onClick={startListening}
          className="p-2 text-zinc-400 hover:text-primary transition-colors hover:bg-white/5 rounded-full"
          aria-label="Voice Search"
        >
          {isListening ? <Loader2 className="animate-spin text-primary" size={20} /> : <Mic size={20} />}
        </button>

        <div className="h-6 w-px bg-white/10" />

        <button
          type="button"
          onClick={handleSearch}
          className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-full border border-white/10 hover:bg-primary hover:border-primary"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
      </div>
    </div>
  )
}
