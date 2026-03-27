/**
 * Input Component Tests
 * 
 * Tests for the LUMEN Design System Input component
 * 
 * Validates Requirements:
 * - 5.3: Error state displays error message
 * - 5.4: Valid state displays checkmark
 * - 5.7: Disabled state prevents interaction
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Input } from '../components/ui/Input'
import { Mail, Search } from 'lucide-react'

describe('Input Component', () => {
  describe('Basic Rendering', () => {
    it('renders input with label', () => {
      render(<Input label="Email" placeholder="Enter email" />)
      const label = screen.getByText('Email')
      const input = screen.getByPlaceholderText('Enter email')
      expect(label).toBeInTheDocument()
      expect(input).toBeInTheDocument()
    })

    it('renders input without label', () => {
      render(<Input placeholder="Enter text" />)
      const input = screen.getByPlaceholderText('Enter text')
      expect(input).toBeInTheDocument()
    })

    it('renders with helper text', () => {
      render(<Input helperText="This is helper text" />)
      const helperText = screen.getByText('This is helper text')
      expect(helperText).toBeInTheDocument()
      expect(helperText).toHaveClass('text-lumen-silver')
    })
  })

  describe('Sizes', () => {
    it('renders small size correctly', () => {
      render(<Input size="sm" placeholder="Small input" />)
      const input = screen.getByPlaceholderText('Small input')
      expect(input).toHaveClass('px-3', 'py-2', 'text-sm', 'h-10')
    })

    it('renders medium size correctly (default)', () => {
      render(<Input size="md" placeholder="Medium input" />)
      const input = screen.getByPlaceholderText('Medium input')
      expect(input).toHaveClass('px-4', 'py-2.5', 'text-sm', 'h-11')
    })

    it('renders large size correctly', () => {
      render(<Input size="lg" placeholder="Large input" />)
      const input = screen.getByPlaceholderText('Large input')
      expect(input).toHaveClass('px-5', 'py-3', 'text-base', 'h-12')
    })
  })

  describe('Validation States', () => {
    it('displays error state with error message', () => {
      render(<Input error="Invalid email address" placeholder="Email" />)
      const input = screen.getByPlaceholderText('Email')
      const errorMessage = screen.getByText('Invalid email address')
      
      expect(input).toHaveClass('border-red-400', 'bg-red-400/10')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveClass('text-red-400')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })

    it('displays valid state with checkmark icon', () => {
      render(<Input valid placeholder="Valid input" />)
      const input = screen.getByPlaceholderText('Valid input')
      
      expect(input).toHaveClass('border-emerald-500')
      
      // Check for checkmark icon
      const checkmark = input.parentElement?.querySelector('svg')
      expect(checkmark).toBeInTheDocument()
    })

    it('does not show checkmark when in error state', () => {
      render(<Input valid error="Error message" placeholder="Input" />)
      const errorMessage = screen.getByText('Error message')
      expect(errorMessage).toBeInTheDocument()
      
      // Checkmark should not be visible when there's an error
      const input = screen.getByPlaceholderText('Input')
      expect(input).toHaveClass('border-red-400')
    })

    it('does not show helper text when error is present', () => {
      render(
        <Input 
          error="Error message" 
          helperText="Helper text" 
          placeholder="Input"
        />
      )
      const errorMessage = screen.getByText('Error message')
      const helperText = screen.queryByText('Helper text')
      
      expect(errorMessage).toBeInTheDocument()
      expect(helperText).not.toBeInTheDocument()
    })
  })

  describe('Disabled State', () => {
    it('prevents interaction when disabled', () => {
      render(
        <Input 
          disabled 
          placeholder="Disabled input"
          value="Disabled value"
        />
      )
      const input = screen.getByPlaceholderText('Disabled input') as HTMLInputElement
      
      expect(input).toBeDisabled()
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
      expect(input.value).toBe('Disabled value')
    })
  })

  describe('Icon Support', () => {
    it('renders icon on the left', () => {
      render(
        <Input 
          icon={<Mail data-testid="mail-icon" />}
          iconPosition="left"
          placeholder="Email"
        />
      )
      const icon = screen.getByTestId('mail-icon')
      const input = screen.getByPlaceholderText('Email')
      
      expect(icon).toBeInTheDocument()
      expect(input).toHaveClass('pl-10')
    })

    it('renders icon on the right', () => {
      render(
        <Input 
          icon={<Search data-testid="search-icon" />}
          iconPosition="right"
          placeholder="Search"
        />
      )
      const icon = screen.getByTestId('search-icon')
      const input = screen.getByPlaceholderText('Search')
      
      expect(icon).toBeInTheDocument()
      expect(input).toHaveClass('pr-10')
    })

    it('does not render custom icon when valid state is active', () => {
      render(
        <Input 
          icon={<Search data-testid="search-icon" />}
          iconPosition="right"
          valid
          placeholder="Search"
        />
      )
      const searchIcon = screen.queryByTestId('search-icon')
      expect(searchIcon).not.toBeInTheDocument()
      
      // Checkmark should be visible instead
      const input = screen.getByPlaceholderText('Search')
      const checkmark = input.parentElement?.querySelector('svg')
      expect(checkmark).toBeInTheDocument()
    })
  })

  describe('Label Association', () => {
    it('associates label with input using htmlFor', () => {
      render(<Input label="Email Address" id="email-input" />)
      const label = screen.getByText('Email Address')
      const input = screen.getByLabelText('Email Address')
      
      expect(label).toHaveAttribute('for', 'email-input')
      expect(input).toHaveAttribute('id', 'email-input')
    })

    it('generates unique id when not provided', () => {
      render(<Input label="Username" />)
      const input = screen.getByLabelText('Username')
      
      expect(input).toHaveAttribute('id')
      expect(input.getAttribute('id')).toBeTruthy()
    })
  })

  describe('User Interactions', () => {
    it('handles onChange events', () => {
      const handleChange = vi.fn()
      
      render(<Input placeholder="Type here" onChange={handleChange} />)
      const input = screen.getByPlaceholderText('Type here')
      
      fireEvent.change(input, { target: { value: 'test value' } })
      expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it('handles onFocus events', () => {
      const handleFocus = vi.fn()
      
      render(<Input placeholder="Focus me" onFocus={handleFocus} />)
      const input = screen.getByPlaceholderText('Focus me')
      
      fireEvent.focus(input)
      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('handles onBlur events', () => {
      const handleBlur = vi.fn()
      
      render(<Input placeholder="Blur me" onBlur={handleBlur} />)
      const input = screen.getByPlaceholderText('Blur me')
      
      fireEvent.blur(input)
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('has proper focus styles', () => {
      render(<Input placeholder="Accessible input" />)
      const input = screen.getByPlaceholderText('Accessible input')
      
      expect(input).toHaveClass(
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-lumen-gold',
        'focus:ring-offset-2'
      )
    })

    it('has proper ARIA attributes for error state', () => {
      render(<Input error="Error message" placeholder="Input" />)
      const errorMessage = screen.getByText('Error message')
      
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })

    it('supports required attribute', () => {
      render(<Input required placeholder="Required input" />)
      const input = screen.getByPlaceholderText('Required input')
      
      expect(input).toBeRequired()
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className', () => {
      render(<Input className="custom-class" placeholder="Custom input" />)
      const input = screen.getByPlaceholderText('Custom input')
      
      expect(input).toHaveClass('custom-class')
    })

    it('maintains base styles with custom className', () => {
      render(<Input className="custom-class" placeholder="Custom input" />)
      const input = screen.getByPlaceholderText('Custom input')
      
      expect(input).toHaveClass('rounded-xl', 'bg-lumen-surface', 'custom-class')
    })
  })
})
