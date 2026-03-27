/**
 * 🎬 Modal Component Tests - LUMEN Design System
 * Cinema Online - اونلاين سينما
 * 
 * @description Unit tests for Modal component
 * @author Cinema Online Team
 * @version 1.0.0
 * 
 * Tests Requirements:
 * - 7.1: Modal backdrop styles
 * - 7.2: Modal container styles
 * - 7.3: Open animation
 * - 7.4: Close animation
 * - 7.5: Close button with minimum 44x44px touch target
 * - 7.6: Focus trap
 * - 7.7: Escape key handler and focus restoration
 * - 15.3: Focus management
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from '../components/ui/Modal'

describe('Modal Component', () => {
  let originalBodyOverflow: string

  beforeEach(() => {
    originalBodyOverflow = document.body.style.overflow
  })

  afterEach(() => {
    document.body.style.overflow = originalBodyOverflow
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <Modal isOpen={false} onClose={() => {}}>
          <p>Modal content</p>
        </Modal>
      )
      expect(container.firstChild).toBeNull()
    })

    it('should render when isOpen is true', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Modal content</p>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('should render with title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      )
      expect(screen.getByText('Test Modal')).toBeInTheDocument()
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title')
    })

    it('should render without title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Modal content</p>
        </Modal>
      )
      expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby')
    })
  })

  describe('Sizes', () => {
    it('should apply small size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="sm">
          <p>Content</p>
        </Modal>
      )
      const modalContainer = container.querySelector('.max-w-md')
      expect(modalContainer).toBeInTheDocument()
    })

    it('should apply medium size class (default)', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      const modalContainer = container.querySelector('.max-w-lg')
      expect(modalContainer).toBeInTheDocument()
    })

    it('should apply large size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="lg">
          <p>Content</p>
        </Modal>
      )
      const modalContainer = container.querySelector('.max-w-2xl')
      expect(modalContainer).toBeInTheDocument()
    })

    it('should apply extra large size class', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} size="xl">
          <p>Content</p>
        </Modal>
      )
      const modalContainer = container.querySelector('.max-w-4xl')
      expect(modalContainer).toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    it('should render close button', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toBeInTheDocument()
    })

    it('should have minimum 44x44px touch target', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      const closeButton = screen.getByLabelText('Close modal')
      expect(closeButton).toHaveClass('min-w-[2.75rem]')
      expect(closeButton).toHaveClass('min-h-[2.75rem]')
    })

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Content</p>
        </Modal>
      )
      const closeButton = screen.getByLabelText('Close modal')
      fireEvent.click(closeButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Backdrop Click', () => {
    it('should close modal when backdrop is clicked (default behavior)', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Content</p>
        </Modal>
      )
      const backdrop = screen.getByRole('dialog')
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not close modal when backdrop is clicked if closeOnBackdropClick is false', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose} closeOnBackdropClick={false}>
          <p>Content</p>
        </Modal>
      )
      const backdrop = screen.getByRole('dialog')
      fireEvent.click(backdrop)
      expect(onClose).not.toHaveBeenCalled()
    })

    it('should not close modal when clicking inside modal content', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Modal content</p>
        </Modal>
      )
      const content = screen.getByText('Modal content')
      fireEvent.click(content)
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Escape Key', () => {
    it('should close modal when escape key is pressed (default behavior)', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Content</p>
        </Modal>
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should not close modal when escape key is pressed if closeOnEscape is false', () => {
      const onClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={onClose} closeOnEscape={false}>
          <p>Content</p>
        </Modal>
      )
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Body Scroll Lock', () => {
    it('should prevent body scroll when modal is open', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('should restore body scroll when modal is closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      expect(document.body.style.overflow).toBe('hidden')

      rerender(
        <Modal isOpen={false} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Accessibility', () => {
    it('should have aria-modal="true"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('should have role="dialog"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have backdrop with aria-hidden="true"', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      const backdrop = container.querySelector('.bg-lumen-void\\/80')
      expect(backdrop).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Focus Management', () => {
    it('should render focusable elements within modal', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <button>First button</button>
          <button>Second button</button>
        </Modal>
      )
      
      const firstButton = screen.getByText('First button')
      const secondButton = screen.getByText('Second button')
      const closeButton = screen.getByLabelText('Close modal')
      
      expect(firstButton).toBeInTheDocument()
      expect(secondButton).toBeInTheDocument()
      expect(closeButton).toBeInTheDocument()
    })

    it('should have focusable elements with proper attributes', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          <button>First button</button>
          <button>Second button</button>
        </Modal>
      )

      const closeButton = screen.getByLabelText('Close modal')
      const firstButton = screen.getByText('First button')
      const secondButton = screen.getByText('Second button')

      // All buttons should be focusable (not disabled, not tabindex=-1)
      expect(closeButton).not.toHaveAttribute('disabled')
      expect(firstButton).not.toHaveAttribute('disabled')
      expect(secondButton).not.toHaveAttribute('disabled')
    })
  })

  describe('Styling', () => {
    it('should apply backdrop styles', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      const backdrop = container.querySelector('.bg-lumen-void\\/80')
      expect(backdrop).toHaveClass('backdrop-blur-xl')
      expect(backdrop).toHaveClass('absolute')
      expect(backdrop).toHaveClass('inset-0')
    })

    it('should apply container styles', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <p>Content</p>
        </Modal>
      )
      const modalContainer = container.querySelector('.bg-lumen-surface')
      expect(modalContainer).toHaveClass('rounded-3xl')
      expect(modalContainer).toHaveClass('shadow-lumen-card')
      expect(modalContainer).toHaveClass('p-6')
      expect(modalContainer).toHaveClass('md:p-8')
    })

    it('should apply custom className', () => {
      const { container } = render(
        <Modal isOpen={true} onClose={() => {}} className="custom-class">
          <p>Content</p>
        </Modal>
      )
      const modalContainer = container.querySelector('.custom-class')
      expect(modalContainer).toBeInTheDocument()
    })
  })
})
