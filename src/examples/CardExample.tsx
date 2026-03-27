/**
 * 🎬 Card Component Example
 * Cinema Online - اونلاين سينما
 * 
 * @description Example usage of the Card component
 */

import { Card } from '../components/ui'

export const CardExample = () => {
  return (
    <div className="p-8 bg-lumen-void min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-lumen-cream mb-8">
          Card Component Examples
        </h1>

        {/* Movie Card with Poster */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Movie Card (2:3 Portrait)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card
              variant="interactive"
              poster="https://image.tmdb.org/t/p/w500/example.jpg"
              title="The Dark Knight"
              subtitle="2008"
              rating={9.0}
              metadata={['Action', '2h 32m', 'PG-13']}
              aspectRatio="2/3"
            />
            <Card
              variant="interactive"
              poster="https://image.tmdb.org/t/p/w500/example2.jpg"
              title="Inception"
              subtitle="2010"
              rating={8.8}
              metadata={['Sci-Fi', '2h 28m']}
              aspectRatio="2/3"
            />
          </div>
        </section>

        {/* TV Show Card with Landscape */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            TV Show Card (16:9 Landscape)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card
              variant="interactive"
              poster="https://image.tmdb.org/t/p/w500/example3.jpg"
              title="Breaking Bad"
              subtitle="2008-2013"
              rating={9.5}
              metadata={['Drama', '5 Seasons']}
              aspectRatio="16/9"
            />
          </div>
        </section>

        {/* Loading State */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Loading State
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card loading aspectRatio="2/3" />
            <Card loading aspectRatio="2/3" />
            <Card loading aspectRatio="2/3" />
          </div>
        </section>

        {/* Static Card (No Hover) */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Static Card (No Hover Effects)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Card
              variant="static"
              poster="https://image.tmdb.org/t/p/w500/example4.jpg"
              title="Static Card"
              subtitle="No Hover"
              rating={7.5}
              aspectRatio="2/3"
            />
          </div>
        </section>

        {/* Custom Content Card */}
        <section>
          <h2 className="text-xl font-semibold text-lumen-cream mb-4">
            Custom Content Card
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card variant="interactive">
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-lumen-cream">
                  Custom Card Content
                </h3>
                <p className="text-sm text-lumen-silver">
                  You can pass custom children to the Card component for
                  complete flexibility.
                </p>
                <button className="px-4 py-2 bg-lumen-gold text-lumen-void rounded-lg hover:brightness-110 transition-all">
                  Learn More
                </button>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}

export default CardExample
