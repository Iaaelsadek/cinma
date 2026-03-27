/**
 * ErrorState Component Tests
 * 
 * Tests for the LUMEN Design System ErrorState component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorState } from '../components/ui/ErrorState'
import { AlertTriangle } from 'lucide-react'

describe('ErrorState Component', () => {
  describe('Basic Rendering', () => {
    it('renders error message correctly', () => {
      render(<ErrorState message="Something went wrong" />)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('renders with optional title', () => {
      render(<ErrorState title="Error" message="Something went wrong" />)
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('renders without title when not provided', () => {
      render(<ErrorState message="Something went wrong" />)
      expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('renders default AlertCircle icon', () => {
      const { container } = render(<ErrorState message="Error occurred" />)
      const icon = container.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('w-16', 'h-16')
    })

    it('renders custom icon when provided', () => {
      render(
        <ErrorState 
          message="Error occurred" 
          icon={<AlertTriangle data-testid="custom-icon" />} 
        />
      )
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('applies correct background and border styles', () => {
      const { container } = render(<ErrorState message="Error" />)
      const errorDiv = container.firstChild as HTMLElement
      expect(errorDiv).toHaveClass('bg-red-400/10')
      expect(errorDiv).toHaveClass('border-red-400/20')
      expect(errorDiv).toHaveClass('rounded-2xl')
    })

    it('applies red-400 text color', () => {
      const { container } = render(<ErrorState message="Error message" />)
      const message = screen.getByText('Error message')
      expect(message).toHaveClass('text-red-400')
    })

    it('applies centered layout', () => {
      const { container } = render(<ErrorState message="Error" />)
      const errorDiv = container.firstChild as HTMLElement
      expect(errorDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center')
    })

    it('applies custom className', () => {
      const { container } = render(
        <ErrorState message="Error" className="custom-class" />
      )
      const errorDiv = container.firstChild as HTMLElement
      expect(errorDiv).toHaveClass('custom-class')
    })
  })

  describe('Retry Button', () => {
    it('renders retry button when onRetry is provided', () => {
      const handleRetry = vi.fn()
      render(<ErrorState message="Error" onRetry={handleRetry} />)
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('does not render retry button when onRetry is not provided', () => {
      render(<ErrorState message="Error" />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('calls onRetry when retry button is clicked', () => {
      const handleRetry = vi.fn()
      render(<ErrorState message="Error" onRetry={handleRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(retryButton)
      
      expect(handleRetry).toHaveBeenCalledTimes(1)
    })

    it('uses custom retry label', () => {
      const handleRetry = vi.fn()
      render(
        <ErrorState 
          message="Error" 
          onRetry={handleRetry} 
          retryLabel="Retry Now" 
        />
      )
      expect(screen.getByRole('button', { name: /retry now/i })).toBeInTheDocument()
    })

    it('renders retry button with danger variant', () => {
      const handleRetry = vi.fn()
      render(<ErrorState message="Error" onRetry={handleRetry} />)
      
      const retryButton = screen.getByRole('button', { name: /try again/i })
      expect(retryButton).toHaveClass('bg-semantic-error')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA role', () => {
      const { container } = render(<ErrorState message="Error" />)
      const errorDiv = container.firstChild as HTMLElement
      expect(errorDiv).toHaveAttribute('role', 'alert')
    })

    it('has aria-live attribute', () => {
      const { container } = render(<ErrorState message="Error" />)
      const errorDiv = container.firstChild as HTMLElement
      expect(errorDiv).toHaveAttribute('aria-live', 'polite')
    })

    it('icon has aria-hidden attribute', () => {
      const { container } = render(<ErrorState message="Error" />)
      const icon = container.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })

    it('retry button has proper aria-label', () => {
      const handleRetry = vi.fn()
      render(
        <ErrorState 
          message="Error" 
          onRetry={handleRetry} 
          retryLabel="Retry Action" 
        />
      )
      const retryButton = screen.getByRole('button')
      expect(retryButton).toHaveAttribute('aria-label', 'Retry Action')
    })
  })

  describe('Icon Size', () => {
    it('renders icon at 64px (w-16 h-16) as per requirements', () => {
      const { container } = render(<ErrorState message="Error" />)
      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('w-16', 'h-16')
    })
  })
})
