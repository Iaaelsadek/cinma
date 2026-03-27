/**
 * 🎬 Card Component Tests
 * Cinema Online - اونلاين سينما
 * 
 * @description Unit tests for Card component
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from '../components/ui/Card'

describe('Card Component', () => {
  it('renders with title and subtitle', () => {
    render(
      <Card
        title="Test Movie"
        subtitle="2024"
        rating={8.5}
        metadata={['Action', '2h 30m']}
      />
    )

    expect(screen.getByText('Test Movie')).toBeInTheDocument()
    expect(screen.getByText('2024')).toBeInTheDocument()
    expect(screen.getByText('8.5')).toBeInTheDocument()
  })

  it('renders loading skeleton when loading prop is true', () => {
    const { container } = render(<Card loading />)
    
    // Check for skeleton animation class
    const skeleton = container.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('renders custom children when provided', () => {
    render(
      <Card>
        <div data-testid="custom-content">Custom Content</div>
      </Card>
    )

    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
  })

  it('renders with poster image', () => {
    render(
      <Card
        poster="https://example.com/poster.jpg"
        title="Test Movie"
      />
    )

    const img = screen.getByAltText('Test Movie')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/poster.jpg')
  })

  it('applies correct aspect ratio', () => {
    const { container } = render(
      <Card
        poster="https://example.com/poster.jpg"
        aspectRatio="16/9"
      />
    )

    const posterContainer = container.querySelector('.aspect-video')
    expect(posterContainer).toBeInTheDocument()
  })

  it('renders metadata with separators', () => {
    render(
      <Card
        title="Test Movie"
        metadata={['Action', '2h 30m', 'PG-13']}
      />
    )

    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('2h 30m')).toBeInTheDocument()
    expect(screen.getByText('PG-13')).toBeInTheDocument()
  })

  it('renders rating with star icon', () => {
    render(<Card rating={9.2} />)

    expect(screen.getByText('9.2')).toBeInTheDocument()
    // Star icon should be present
    const starIcon = screen.getByText('9.2').previousElementSibling
    expect(starIcon).toBeInTheDocument()
  })

  it('applies static variant without hover effects', () => {
    const { container } = render(
      <Card variant="static" title="Static Card" />
    )

    const card = container.firstChild
    expect(card).not.toHaveClass('cursor-pointer')
  })

  it('applies interactive variant with cursor pointer', () => {
    const { container } = render(
      <Card variant="interactive" title="Interactive Card" />
    )

    const card = container.firstChild
    expect(card).toHaveClass('cursor-pointer')
  })
})
