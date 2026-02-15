
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black p-8 text-white">
          <h1 className="mb-4 text-3xl font-bold text-red-500">Something went wrong</h1>
          <pre className="max-w-full overflow-auto rounded bg-zinc-900 p-4 text-sm text-red-200">
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded bg-primary px-6 py-2 font-bold text-white hover:bg-primary/80"
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
