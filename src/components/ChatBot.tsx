// components/ChatBot.tsx - AI Chatbot UI Component with 3D Robot Animation
import { useState, useRef, useEffect, memo } from 'react'
import { Send, X, MessageCircle, Loader2, Sparkles } from 'lucide-react'
import Lottie from 'lottie-react'

// CSS-in-JS styles to prevent FOUC and ensure fixed dimensions
const botStyles = {
  button: {
    position: 'fixed' as const,
    zIndex: 999999,
    width: '150px',
    height: '150px',
    minWidth: '150px',
    minHeight: '150px',
    maxWidth: '150px',
    maxHeight: '150px',
    overflow: 'hidden',
    transition: 'right 0.3s ease',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    margin: '0',
    outline: 'none',
    bottom: '16px'
  },
  innerWrapper: {
    width: '150px',
    height: '150px',
    minWidth: '150px',
    minHeight: '150px',
    maxWidth: '150px',
    maxHeight: '150px',
    overflow: 'hidden',
    position: 'relative' as const,
    transition: 'transform 0.3s ease'
  },
  fallbackContainer: {
    width: '150px',
    height: '150px',
    minWidth: '150px',
    minHeight: '150px',
    maxWidth: '150px',
    maxHeight: '150px',
    background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    // Match the Lottie animation filter exactly
    filter: 'drop-shadow(0 0 1px rgba(147, 51, 234, 1)) drop-shadow(0 0 2px rgba(239, 68, 68, 0.8))'
  },
  messageIcon: {
    width: '64px',
    height: '64px',
    minWidth: '64px',
    minHeight: '64px',
    maxWidth: '64px',
    maxHeight: '64px',
    color: 'white'
  },
  lottieWrapper: {
    width: '150px',
    height: '150px',
    minWidth: '150px',
    minHeight: '150px',
    maxWidth: '150px',
    maxHeight: '150px',
    filter: 'drop-shadow(0 0 1px rgba(147, 51, 234, 1)) drop-shadow(0 0 2px rgba(239, 68, 68, 0.8))',
    animation: 'rgb-drop-shadow 3s ease-in-out infinite'
  },
  lottie: {
    width: '150px',
    height: '150px',
    minWidth: '150px',
    minHeight: '150px',
    maxWidth: '150px',
    maxHeight: '150px'
  }
}



interface Message {
  role: 'user' | 'assistant'
  content: string
}

// ✅ Memoized to prevent unnecessary re-renders
const ChatBot = memo(function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isBlinking, setIsBlinking] = useState(false)
  const [botAnimation, setBotAnimation] = useState<any>(null)
  const [rightOffset, setRightOffset] = useState(20) // Dynamic right offset
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatWindowRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load Lottie animation
  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost';
        const res = await fetch(`${baseUrl}/cinmabot.json`);
        const data = await res.json();
        setBotAnimation(data);
      } catch (err) {
      }
    };
    loadAnimation();
  }, []);

  // Calculate right offset to respect page boundaries
  useEffect(() => {
    const calculateOffset = () => {
      const viewportWidth = window.innerWidth
      const maxContentWidth = 2400 // max-w-[2400px]
      const horizontalPadding = viewportWidth >= 768 ? 48 : 16 // md:px-12 (48px) or px-4 (16px)
      
      if (viewportWidth > maxContentWidth + (horizontalPadding * 2)) {
        // Wide screen: center the content and calculate margin
        const sideMargin = (viewportWidth - maxContentWidth) / 2
        setRightOffset(sideMargin + horizontalPadding)
      } else {
        // Normal screen: use padding
        setRightOffset(horizontalPadding)
      }
    }

    calculateOffset()
    window.addEventListener('resize', calculateOffset)
    return () => window.removeEventListener('resize', calculateOffset)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // أنيميشن رمش العين كل 3-5 ثواني
  useEffect(() => {
    if (!isOpen) {
      const blinkInterval = setInterval(() => {
        setIsBlinking(true)
        setTimeout(() => setIsBlinking(false), 200)
      }, Math.random() * 2000 + 3000) // عشوائي بين 3-5 ثواني

      return () => clearInterval(blinkInterval)
    }
  }, [isOpen])

  // منع سكرول الموقع لما الماوس فوق الشات
  useEffect(() => {
    if (!isOpen) {return}

    const handleWheel = (e: WheelEvent) => {
      if (chatWindowRef.current?.contains(e.target as Node)) {
        e.stopPropagation()
      }
    }

    document.addEventListener('wheel', handleWheel, { passive: false })
    return () => document.removeEventListener('wheel', handleWheel)
  }, [isOpen])

  // إغلاق الشات لما تدوس برا
  useEffect(() => {
    if (!isOpen) {return}

    const handleClickOutside = (e: MouseEvent) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const sendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || input.trim()
    if (!messageToSend || loading) {return}

    setInput('')
    setLoading(true)

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: messageToSend }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          conversationHistory: messages,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ])
      
      // Auto-open movie/TV page if URL is present AND it's from the bot (not user input)
      const urlMatch = data.message.match(/(https:\/\/cinma\.online\/watch\/[^\s]+)/g)
      if (urlMatch && urlMatch.length > 0 && !messageToSend.includes('http')) {
        // Open in same page (not new tab)
        window.location.href = urlMatch[0]
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'عذراً، حدث خطأ. حاول مرة أخرى.',
        },
      ])
    } finally {
      setLoading(false)
      // رجع الـ focus للـ input بعد إرسال الرسالة
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating Bot Icon - FIXED POSITION with Dynamic Right Offset */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open chat with AI assistant"
          style={{ 
            ...botStyles.button,
            right: `${rightOffset}px`
          }}
        >
          {/* Tooltip */}
          <div style={{
            position: 'absolute',
            bottom: '100%',
            right: '0',
            marginBottom: '12px',
            opacity: '0',
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none'
          }}>
            <div style={{
              backgroundColor: '#111827',
              color: 'white',
              fontSize: '12px',
              padding: '8px 12px',
              borderRadius: '12px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
              whiteSpace: 'nowrap'
            }}>
              <span style={{ fontWeight: 'bold' }}>اسألني عن أي فيلم! 🎬</span>
              <div style={{
                position: 'absolute',
                top: '100%',
                right: '16px',
                width: '8px',
                height: '8px',
                backgroundColor: '#111827',
                transform: 'rotate(45deg)',
                marginTop: '-4px'
              }}></div>
            </div>
          </div>

          {/* Bot Image with Animations - Lottie or Fallback - Fixed Size */}
          <div style={botStyles.innerWrapper}>
            {botAnimation ? (
              <div 
                style={{
                  ...botStyles.lottieWrapper,
                  transform: isBlinking ? 'scale(0.95)' : 'scale(1)',
                  transition: 'transform 0.3s ease'
                }}
              >
                <Lottie 
                  animationData={botAnimation}
                  loop={true}
                  style={botStyles.lottie}
                />
              </div>
            ) : (
              <div style={{ width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageCircle size={60} style={{ width: '60px', height: '60px' }} />
              </div>
            )}
          </div>
        </button>
      )}

      {/* Chat Window - FIXED POSITION with Dynamic Right Offset */}
      {isOpen && (
        <div 
          ref={chatWindowRef}
          className="fixed bottom-8 w-[320px] h-[480px] bg-gray-800/40 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-400/20"
          style={{ 
            position: 'fixed', 
            right: `${rightOffset}px`,
            zIndex: 999999,
            transition: 'right 0.3s ease'
          }}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-gray-400/20 bg-gray-700/30">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  مساعد أونلاين سينما AI
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                </h3>
                <p className="text-white/80 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  متصل الآن
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 p-1.5 rounded-lg"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-900/20">
            {messages.length === 0 && (
              <div className="text-center text-white mt-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-3xl flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-bold mb-2">مرحباً بك! 👋</h4>
                <p className="text-white/80 text-sm mb-3">كيف يمكنني مساعدتك اليوم؟</p>
                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                  <button
                    onClick={() => sendMessage('اقترح لي أفلام أكشن')}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm hover:bg-white/20 transition-all cursor-pointer text-right"
                  >
                    💫 اقترح لي أفلام أكشن
                  </button>
                  <button
                    onClick={() => sendMessage('أفضل أفلام 2026')}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm hover:bg-white/20 transition-all cursor-pointer text-right"
                  >
                    🎬 أفضل أفلام 2026
                  </button>
                  <button
                    onClick={() => sendMessage('أفلام كوميدي خفيفة')}
                    className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm hover:bg-white/20 transition-all cursor-pointer text-right"
                  >
                    😂 أفلام كوميدي خفيفة
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, index) => {
              // Remove hidden comments from display
              const cleanContent = msg.content
                .replace(/<!--\s*MOVIE_IDS:\s*[^>]+\s*-->/gi, '')
                .replace(/<!--\s*MOVIE_POSTERS:\s*[^>]+\s*-->/gi, '')
                .trim()
              
              // Check if message contains a watch URL
              const urlMatch = cleanContent.match(/(https:\/\/cinma\.online\/watch\/[^\s]+)/g)
              const hasUrl = urlMatch && urlMatch.length > 0
              
              // Extract numbered movie list (1. **Title** or 1. Title)
              const hasNumberedList = /^\d+\.\s*\*?\*?[^\n]+/m.test(cleanContent)
              
              // Extract hidden movie IDs and posters from original content
              const idsMatch = msg.content.match(/<!--\s*MOVIE_IDS:\s*([^>]+)\s*-->/)
              const postersMatch = msg.content.match(/<!--\s*MOVIE_POSTERS:\s*([^>]+)\s*-->/)
              
              const movieIds: Record<string, string> = {}
              const moviePosters: Record<string, string> = {}
              
              if (idsMatch) {
                idsMatch[1].split(',').forEach(pair => {
                  const [num, id] = pair.trim().split(':')
                  if (num && id) {movieIds[num] = id}
                })
              }
              
              if (postersMatch) {
                postersMatch[1].split(',').forEach(pair => {
                  const parts = pair.trim().split(':')
                  const num = parts[0]
                  const url = parts.slice(1).join(':') // Handle URLs with colons
                  if (num && url) {moviePosters[num] = url}
                })
              }
              
              return (
                <div
                  key={index}
                  className={`flex ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-2xl shadow-lg ${
                      msg.role === 'user'
                        ? 'bg-white text-purple-900 ml-2'
                        : 'bg-white/10 border border-white/20 text-white mr-2'
                    }`}
                  >
                    {hasUrl ? (
                      <div className="space-y-3">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {cleanContent.split(urlMatch[0])[0]}
                        </p>
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          تم فتح الفيلم في نفس الصفحة
                        </div>
                      </div>
                    ) : hasNumberedList && msg.role === 'assistant' ? (
                      <div className="space-y-3">
                        {cleanContent.split('\n').map((line, lineIndex) => {
                          // Skip empty lines
                          if (!line.trim()) {
                            return null
                          }
                          
                          // Match numbered items: "1. **Title**" or "1. Title"
                          const match = line.match(/^(\d+)\.\s*\*?\*?([^*\n]+)\*?\*?(.*)$/)
                          if (match) {
                            const num = match[1]
                            const title = match[2].trim()
                            const rest = match[3].trim()
                            const posterUrl = moviePosters[num]
                            
                            return (
                              <div key={lineIndex} className="flex items-start gap-3">
                                <span className="text-purple-400 font-bold shrink-0 mt-1">{num}.</span>
                                <div className="flex-1 flex gap-3">
                                  {posterUrl && (
                                    <img 
                                      src={posterUrl} 
                                      alt={title}
                                      loading="lazy"
                                      className="w-16 h-24 object-cover rounded-lg shadow-md shrink-0"
                                      onError={(e) => { e.currentTarget.style.display = 'none' }}
                                    />
                                  )}
                                  <div className="flex-1">
                                    <button
                                      onClick={() => sendMessage(num)}
                                      className="text-left font-bold text-white hover:text-purple-400 transition-colors underline decoration-purple-400/50 hover:decoration-purple-400 break-words block"
                                    >
                                      {title}
                                    </button>
                                    {rest && <p className="text-xs text-white/80 mt-1">{rest}</p>}
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          
                          // Regular line - but make any **movie name** clickable
                          if (line.trim() && msg.role === 'assistant') {
                            // Find all **text** patterns and make them clickable
                            const parts = line.split(/(\*\*[^*]+\*\*)/)
                            return (
                              <p key={lineIndex} className="text-sm leading-relaxed">
                                {parts.map((part, partIndex) => {
                                  if (part.startsWith('**') && part.endsWith('**')) {
                                    const movieName = part.slice(2, -2)
                                    return (
                                      <button
                                        key={partIndex}
                                        onClick={() => sendMessage(movieName)}
                                        className="font-bold text-white hover:text-purple-400 transition-colors underline decoration-purple-400/50 hover:decoration-purple-400"
                                      >
                                        {movieName}
                                      </button>
                                    )
                                  }
                                  return <span key={partIndex}>{part}</span>
                                })}
                              </p>
                            )
                          }
                          
                          return line.trim() ? (
                            <p key={lineIndex} className="text-sm leading-relaxed">{line}</p>
                          ) : null
                        })}
                      </div>
                    ) : (
                      // Regular message - make any **movie name** clickable
                      msg.role === 'assistant' && cleanContent.includes('**') ? (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">
                          {cleanContent.split(/(\*\*[^*]+\*\*)/).map((part, partIndex) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              const movieName = part.slice(2, -2)
                              return (
                                <button
                                  key={partIndex}
                                  onClick={() => sendMessage(movieName)}
                                  className="font-bold text-white hover:text-purple-400 transition-colors underline decoration-purple-400/50 hover:decoration-purple-400"
                                >
                                  {movieName}
                                </button>
                              )
                            }
                            return <span key={partIndex}>{part}</span>
                          })}
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{cleanContent}</p>
                      )
                    )}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/10 border border-white/20 p-4 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <span className="text-white text-sm">جاري الكتابة...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-5 border-t border-gray-400/20 bg-gray-700/30">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="اكتب رسالتك هنا..."
                className="flex-1 bg-gray-700/40 border border-gray-400/30 text-white placeholder-gray-300 px-5 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-400/50 transition-all duration-200"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="bg-white text-purple-600 p-3 rounded-2xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
                aria-label="Send message"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})

export default ChatBot
