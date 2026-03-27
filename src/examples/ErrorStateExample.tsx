/**
 * 🎬 ErrorState Component Example
 * Cinema Online - اونلاين سينما
 * 
 * @description Example usage of the ErrorState component
 */

import { useState } from 'react'
import { ErrorState } from '../components/ui'
import { WifiOff, ServerCrash, AlertTriangle } from 'lucide-react'

export const ErrorStateExample = () => {
  const [retryCount, setRetryCount] = useState(0)

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
  }

  return (
    <div className="p-8 bg-lumen-void min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-lumen-cream mb-8">
          ErrorState Component Examples
        </h1>

        {/* Basic Error */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Basic Error
          </h2>
          <ErrorState 
            message="Something went wrong. Please try again later."
          />
        </section>

        {/* Error with Title */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Error with Title
          </h2>
          <ErrorState 
            title="Connection Failed"
            message="Unable to connect to the server. Please check your internet connection."
          />
        </section>

        {/* Error with Retry */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Error with Retry Button
          </h2>
          <ErrorState 
            title="Failed to Load Content"
            message="We couldn't load the content you requested. Please try again."
            onRetry={handleRetry}
            retryLabel="Try Again"
          />
          {retryCount > 0 && (
            <p className="text-sm text-lumen-silver mt-4 text-center">
              Retry count: {retryCount}
            </p>
          )}
        </section>

        {/* Custom Icons */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Custom Icons
          </h2>
          <div className="space-y-6">
            {/* Network Error */}
            <div>
              <h3 className="text-sm font-medium text-lumen-silver mb-2">
                Network Error
              </h3>
              <ErrorState 
                title="No Internet Connection"
                message="Please check your network settings and try again."
                icon={<WifiOff className="w-16 h-16" />}
              />
            </div>

            {/* Server Error */}
            <div>
              <h3 className="text-sm font-medium text-lumen-silver mb-2">
                Server Error
              </h3>
              <ErrorState 
                title="Server Error"
                message="Our servers are experiencing issues. We're working to fix this."
                icon={<ServerCrash className="w-16 h-16" />}
                retryLabel="Refresh"
              />
            </div>

            {/* Warning Style */}
            <div>
              <h3 className="text-sm font-medium text-lumen-silver mb-2">
                Warning Message
              </h3>
              <ErrorState 
                title="Content Unavailable"
                message="This content is not available in your region."
                icon={<AlertTriangle className="w-16 h-16" />}
              />
            </div>
          </div>
        </section>

        {/* In Context */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            In Context
          </h2>
          
          {/* In a Card */}
          <div>
            <h3 className="text-sm font-medium text-lumen-silver mb-2">
              Inside a Card Container
            </h3>
            <div className="p-6 bg-lumen-surface rounded-2xl border border-lumen-muted">
              <ErrorState 
                message="Failed to load movie details"
              />
            </div>
          </div>
        </section>

        {/* Styling Variations */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Styling Variations
          </h2>
          <div className="space-y-6">
            {/* Compact */}
            <div>
              <h3 className="text-sm font-medium text-lumen-silver mb-2">
                Compact Version
              </h3>
              <ErrorState 
                message="Error loading data"
                retryLabel="Retry"
                className="py-6"
              />
            </div>

            {/* Full Width */}
            <div>
              <h3 className="text-sm font-medium text-lumen-silver mb-2">
                Full Width Container
              </h3>
              <ErrorState 
                title="Page Not Found"
                message="The page you're looking for doesn't exist or has been moved."
                retryLabel="Go Back"
                className="min-h-[400px]"
              />
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Accessibility Features
          </h2>
          <div className="p-6 bg-lumen-surface rounded-xl space-y-4">
            <p className="text-sm text-lumen-silver">
              The ErrorState component includes proper accessibility attributes:
            </p>
            <ul className="list-disc list-inside text-sm text-lumen-silver space-y-2">
              <li>
                <code className="text-lumen-gold">role="alert"</code> - Announces error to screen readers
              </li>
              <li>
                <code className="text-lumen-gold">aria-live="polite"</code> - Non-intrusive announcements
              </li>
              <li>
                <code className="text-lumen-gold">aria-hidden="true"</code> on icon - Prevents redundant announcements
              </li>
              <li>
                <code className="text-lumen-gold">aria-label</code> on retry button - Descriptive button label
              </li>
              <li>
                Red-400 color scheme with proper contrast ratios (WCAG AA compliant)
              </li>
              <li>
                Centered layout with clear visual hierarchy
              </li>
            </ul>
          </div>
        </section>

        {/* Design Specifications */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Design Specifications
          </h2>
          <div className="p-6 bg-lumen-surface rounded-xl space-y-4">
            <p className="text-sm text-lumen-silver mb-4">
              Following LUMEN Design System requirements 9.1 and 9.2:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium text-lumen-cream">Colors</h4>
                <ul className="list-disc list-inside text-lumen-silver space-y-1">
                  <li>Text: <code className="text-lumen-gold">red-400</code></li>
                  <li>Background: <code className="text-lumen-gold">red-400/10</code></li>
                  <li>Border: <code className="text-lumen-gold">red-400/20</code></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-lumen-cream">Layout</h4>
                <ul className="list-disc list-inside text-lumen-silver space-y-1">
                  <li>Icon size: 64px (w-16 h-16)</li>
                  <li>Border radius: rounded-2xl</li>
                  <li>Centered flex column layout</li>
                  <li>Optional retry button with danger variant</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ErrorStateExample
