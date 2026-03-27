/**
 * Spinner Component Tests
 * 
 * Tests for the LUMEN Design System Spinner component
 * Requirements: 8.3, 8.4
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Spinner } from '../components/ui/Spinner'

describe('Spinner Component', () => {
  describe('Rendering', () => {
    it('renders spinner with default props', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveAttribute('aria-label', 'Loading')
    })

    it('renders with custom className', () => {
      render(<Spinner className="custom-class" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('custom-class')
    })
  })

  describe('Sizes', () => {
    it('renders small size (16px)', () => {
      render(<Spinner size="sm" />)
      const spinner = screen.getByRole('status')
      const svg = spinner.querySelector('svg')
      expect(svg).toHaveClass('w-4', 'h-4')
    })

    it('renders medium size (24px) - default', () => {
      render(<Spinner size="md" />)
      const spinner = screen.getByRole('status')
      const svg = spinner.querySelector('svg')
      expect(svg).toHaveClass('w-6', 'h-6')
    })

    it('renders large size (32px)', () => {
      render(<Spinner size="lg" />)
      const spinner = screen.getByRole('status')
      const svg = spinner.querySelector('svg')
      expect(svg).toHaveClass('w-8', 'h-8')
    })

    it('renders extra large size (48px)', () => {
      render(<Spinner size="xl" />)
      const spinner = screen.getByRole('status')
      const svg = spinner.querySelector('svg')
      expect(svg).toHaveClass('w-12', 'h-12')
    })
  })

  describe('Colors', () => {
    it('renders with default gold color', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      const svg = spinner.querySelector('svg')
      expect(svg).toHaveClass('text-lumen-gold')
    })

    it('renders with custom color', () => {
      render(<Spinner color="text-semantic-success" />)
      const spinner = screen.getByRole('status')
      const svg = spinner.querySelector('svg')
      expect(svg).toHaveClass('text-semantic-success')
    })

    it('renders with cream color', () => {
      render(<Spinner color="text-lumen-cream" />)
      const spinner = screen.getByRole('status')
      const svg = spinner.querySelector('svg')
      expect(svg).toHaveClass('text-lumen-cream')
    })
  })

  describe('Animation', () => {
    it('has spin animation', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      const svg = spinner.querySelector('svg')
      expect(svg).toHaveClass('animate-spin')
    })

    it('has 1s linear animation duration', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      const svg = spinner.querySelector('svg')
      const style = svg?.getAttribute('style')
      expect(style).toContain('animation-duration: 1s')
      expect(style).toContain('animation-timing-function: linear')
    })
  })

  describe('Accessibility', () => {
    it('has role="status" for screen readers', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      expect(spinner).toBeInTheDocument()
    })

    it('has aria-label="Loading" for screen readers', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', 'Loading')
    })

    it('maintains accessibility with custom props', () => {
      render(<Spinner size="lg" color="text-semantic-error" />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', 'Loading')
      expect(spinner).toHaveAttribute('role', 'status')
    })
  })

  describe('Layout', () => {
    it('uses inline-flex for proper alignment', () => {
      render(<Spinner />)
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('inline-flex', 'items-center', 'justify-center')
    })

    it('can be used in button context', () => {
      render(
        <button className="flex items-center gap-2">
          <Spinner size="sm" color="text-lumen-void" />
          <span>Loading...</span>
        </button>
      )
      const button = screen.getByRole('button')
      const spinner = screen.getByRole('status')
      expect(button).toContainElement(spinner)
    })
  })
})
