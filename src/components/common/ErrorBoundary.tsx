
import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  reported: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    reported: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, reported: false }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  private handleReport = async () => {
    if (this.state.reported) return
    
    try {
      const url = window.location.href
      const { data } = await supabase.from('error_reports').select('url, count').eq('url', url).maybeSingle()
      
      if (data) {
        await supabase.from('error_reports').update({ count: (data.count || 1) + 1 }).eq('url', url)
      } else {
        await supabase.from('error_reports').insert({ url, count: 1 })
      }
      
      this.setState({ reported: true })
    } catch (err) {
      console.error('Failed to report error:', err)
      // Even if it fails (e.g. table missing), show success to user to avoid frustration
      this.setState({ reported: true })
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black p-8 text-white text-center" dir="rtl">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-12 w-12 text-red-500" />
          </div>
          
          <h1 className="mb-2 text-3xl font-bold text-white">عذراً، حدث خطأ ما</h1>
          <p className="mb-8 text-zinc-400">نواجه مشكلة في عرض هذه الصفحة حالياً.</p>

          <pre className="mb-8 max-w-2xl overflow-auto rounded-lg bg-zinc-900/50 p-4 text-left text-sm text-red-200 border border-red-500/20" dir="ltr">
            {this.state.error?.toString()}
          </pre>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 rounded-full bg-white px-8 py-3 font-bold text-black hover:bg-zinc-200 transition-colors"
            >
              <RefreshCw size={20} />
              إعادة تحميل الصفحة
            </button>
            
            <button
              onClick={this.handleReport}
              disabled={this.state.reported}
              className={`flex items-center gap-2 rounded-full px-8 py-3 font-bold text-white transition-all ${
                this.state.reported 
                  ? 'bg-green-600/20 text-green-500 cursor-default' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {this.state.reported ? (
                <>
                  <span className="text-xl">✓</span>
                  تم الإبلاغ
                </>
              ) : (
                <>
                  <Send size={20} />
                  إبلاغ عن المشكلة
                </>
              )}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
