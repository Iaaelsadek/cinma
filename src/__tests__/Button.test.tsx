/**
 * Button Component Tests
 * 
 * Tests for the LUMEN Design System Button component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../components/ui/Button'
import { Download } from 'lucide-react'

describe('Button Component', () => {
  describe('Variants', () => {
    it('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary Button</Button>)
      const button = screen.getByRole('button', { name: /primary button/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-lumen-gold', 'text-lumen-void')
    })

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary Button</Button>)
      const button = screen.getByRole('button', { name: /secondary button/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-transparent', 'text-lumen-cream')
    })

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost Button</Button>)
      const button = screen.getByRole('button', { name: /ghost button/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-transparent', 'text-lumen-cream')
    })

    it('renders danger variant correctly', () => {
      render(<Button variant="danger">Danger Button</Button>)
      const button = screen.getByRole('button', { name: /danger button/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass('bg-semantic-error', 'text-white')
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<Button size="sm">Small Button</Button>)
      const button = screen.getByRole('button', { name: /small button/i })
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-xs', 'min-h-[2.5rem]')
    })

    it('renders medium size correctly', () => {
      render(<Button size="md">Medium Button</Button>)
      const button = screen.getByRole('button', { name: /medium button/i })
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm', 'min-h-[2.75rem]')
    })

    it('renders large size correctly', () => {
      render(<Button size="lg">Large Button</Button>)
      const button = screen.getByRole('button', { name: /large button/i })
      expect(button).toHaveClass('px-6', 'py-3', 'text-base', 'min-h-[3rem]')
    })
  })

  describe('States', () => {
    it('handles disabled state correctly', () => {
      render(<Button disabled>Disabled Button</Button>)
      const button = screen.getByRole('button', { name: /disabled button/i })
      expect(button).toBeDisabled()
      expect(button.className).toContain('disabled:opacity-40')
      expect(button.className).toContain('disabled:cursor-not-allowed')
    })

    it('handles loading state correctly', () => {
      render(<Button loading>Loading Button</Button>)
      const button = screen.getByRole('button', { name: /loading button/i })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('pointer-events-none')
      // Check for spinner
      const spinner = button.querySelector('svg')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('animate-spin')
    })

    it('handles click events when not disabled', () => {
      const handleClick = vi.fn()
      
      render(<Button onClick={handleClick}>Click Me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })
      
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not handle click events when disabled', () => {
      const handleClick = vi.fn()
      
      render(<Button onClick={handleClick} disabled>Click Me</Button>)
      const button = screen.getByRole('button', { name: /click me/i })
      
      fireEvent.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('Icon Support', () => {
    it('renders icon on the left', () => {
      render(
        <Button icon={<Download data-testid="icon" />} iconPosition="left">
          Download
        </Button>
      )
      const button = screen.getByRole('button', { name: /download/i })
      const icon = screen.getByTestId('icon')
      expect(icon).toBeInTheDocument()
      
      // Icon should come before text
      const buttonContent = button.textContent
      expect(buttonContent).toBe('Download')
    })

    it('renders icon on the right', () => {
      render(
        <Button icon={<Download data-testid="icon" />} iconPosition="right">
          Download
        </Button>
      )
      const _button = screen.getByRole('button', { name: /download/i })
      const icon = screen.getByTestId('icon')
      expect(icon).toBeInTheDocument()
    })

    it('does not render icon when loading', () => {
      render(
        <Button icon={<Download data-testid="icon" />} loading>
          Download
        </Button>
      )
      const icon = screen.queryByTestId('icon')
      expect(icon).not.toBeInTheDocument()
    })
  })

  describe('Full Width', () => {
    it('renders full width button', () => {
      render(<Button fullWidth>Full Width Button</Button>)
      const button = screen.getByRole('button', { name: /full width button/i })
      expect(button).toHaveClass('w-full')
    })
  })

  describe('Accessibility', () => {
    it('has proper focus styles', () => {
      render(<Button>Accessible Button</Button>)
      const button = screen.getByRole('button', { name: /accessible button/i })
      expect(button).toHaveClass('focus:outline-none', 'focus:ring-[3px]', 'focus:ring-lumen-gold')
    })

    it('has proper active styles', () => {
      render(<Button>Active Button</Button>)
      const button = screen.getByRole('button', { name: /active button/i })
      expect(button).toHaveClass('active:scale-95')
    })
  })
})
