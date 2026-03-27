/**
 * 🎬 Spinner Component Example
 * Cinema Online - اونلاين سينما
 * 
 * @description Example usage of the Spinner component
 */

import { Spinner } from '../components/ui'

export const SpinnerExample = () => {
  return (
    <div className="p-8 bg-lumen-void min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-lumen-cream mb-8">
          Spinner Component Examples
        </h1>

        {/* Sizes */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Sizes
          </h2>
          <div className="flex items-center gap-8 p-6 bg-lumen-surface rounded-xl">
            <div className="flex flex-col items-center gap-2">
              <Spinner size="sm" />
              <span className="text-xs text-lumen-silver">Small (16px)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner size="md" />
              <span className="text-xs text-lumen-silver">Medium (24px)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner size="lg" />
              <span className="text-xs text-lumen-silver">Large (32px)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner size="xl" />
              <span className="text-xs text-lumen-silver">XLarge (48px)</span>
            </div>
          </div>
        </section>

        {/* Colors */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Colors
          </h2>
          <div className="flex items-center gap-8 p-6 bg-lumen-surface rounded-xl">
            <div className="flex flex-col items-center gap-2">
              <Spinner color="text-lumen-gold" />
              <span className="text-xs text-lumen-silver">Gold (Default)</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner color="text-lumen-cream" />
              <span className="text-xs text-lumen-silver">Cream</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner color="text-semantic-success" />
              <span className="text-xs text-lumen-silver">Success</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner color="text-semantic-error" />
              <span className="text-xs text-lumen-silver">Error</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Spinner color="text-semantic-info" />
              <span className="text-xs text-lumen-silver">Info</span>
            </div>
          </div>
        </section>

        {/* In Context */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            In Context
          </h2>
          
          {/* Loading Button */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-lumen-silver mb-2">
                Loading Button
              </h3>
              <button className="px-4 py-2 bg-lumen-gold text-lumen-void rounded-lg flex items-center gap-2 pointer-events-none">
                <Spinner size="sm" color="text-lumen-void" />
                <span>Loading...</span>
              </button>
            </div>

            {/* Loading Card */}
            <div>
              <h3 className="text-sm font-medium text-lumen-silver mb-2">
                Loading Card
              </h3>
              <div className="p-8 bg-lumen-surface rounded-xl border border-lumen-muted flex flex-col items-center justify-center gap-4">
                <Spinner size="lg" />
                <p className="text-sm text-lumen-silver">Loading content...</p>
              </div>
            </div>

            {/* Full Page Loader */}
            <div>
              <h3 className="text-sm font-medium text-lumen-silver mb-2">
                Full Page Loader (Preview)
              </h3>
              <div className="relative h-64 bg-lumen-void rounded-xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spinner size="xl" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Accessibility
          </h2>
          <div className="p-6 bg-lumen-surface rounded-xl space-y-4">
            <p className="text-sm text-lumen-silver">
              The Spinner component includes proper accessibility attributes:
            </p>
            <ul className="list-disc list-inside text-sm text-lumen-silver space-y-2">
              <li>
                <code className="text-lumen-gold">role="status"</code> - Indicates loading status
              </li>
              <li>
                <code className="text-lumen-gold">aria-label="Loading"</code> - Provides screen reader text
              </li>
              <li>
                1s linear infinite rotation animation for smooth visual feedback
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SpinnerExample
