/**
 * Tests: ReviewForm Component
 *
 * Task 12.2: Property 3 - Review Form Validation
 * Validates: Requirements 2.2, 13.1
 *
 * Task 12.3: Unit tests for ReviewForm component
 * Requirements: 12.1, 12.2, 12.3, 36.5
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'
import { ReviewForm } from '../../components/features/reviews/ReviewForm'

// ============================================================================
// Property 3: Review Form Validation (Task 12.2)
// Validates: Requirements 2.2, 13.1
// ============================================================================

describe('Property 3: Review Form Validation (form logic)', () => {
  // Test the validation logic directly (same logic used in ReviewForm)
  function isFormValid(reviewText: string): boolean {
    const trimmed = reviewText.trim()
    return trimmed.length >= 10 && trimmed.length <= 5000
  }

  it('should accept review text with 10-5000 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 5000 }).filter(s => s.trim().length >= 10),
        (text) => {
          expect(isFormValid(text)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject review text shorter than 10 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 9 }),
        (text) => {
          expect(isFormValid(text)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject review text longer than 5000 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 5001, maxLength: 5100 }),
        (text) => {
          expect(isFormValid(text)).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })
})

// ============================================================================
// Unit Tests: ReviewForm Component (Task 12.3)
// ============================================================================

const defaultProps = {
  externalId: '550',
  contentType: 'movie' as const,
  onSubmit: vi.fn(),
  onCancel: vi.fn()
}

describe('ReviewForm - Renders correctly', () => {
  it('should render language selector buttons', () => {
    render(<ReviewForm {...defaultProps} />)
    expect(screen.getByText('العربية')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('should render review textarea', () => {
    render(<ReviewForm {...defaultProps} />)
    expect(screen.getByPlaceholderText(/اكتب مراجعتك/)).toBeInTheDocument()
  })

  it('should render submit button', () => {
    render(<ReviewForm {...defaultProps} />)
    expect(screen.getByText('نشر المراجعة')).toBeInTheDocument()
  })

  it('should render cancel button', () => {
    render(<ReviewForm {...defaultProps} />)
    expect(screen.getByText('إلغاء')).toBeInTheDocument()
  })

  it('should render spoiler checkbox', () => {
    render(<ReviewForm {...defaultProps} />)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })
})

describe('ReviewForm - Language switching (RTL/LTR)', () => {
  it('should default to Arabic language', () => {
    render(<ReviewForm {...defaultProps} />)
    const textarea = screen.getByPlaceholderText(/اكتب مراجعتك/)
    expect(textarea).toHaveAttribute('dir', 'rtl')
  })

  it('should switch to LTR when English is selected', () => {
    render(<ReviewForm {...defaultProps} />)
    fireEvent.click(screen.getByText('English'))
    const textarea = screen.getByPlaceholderText(/Write your review/)
    expect(textarea).toHaveAttribute('dir', 'ltr')
  })

  it('should switch back to RTL when Arabic is selected', () => {
    render(<ReviewForm {...defaultProps} />)
    fireEvent.click(screen.getByText('English'))
    fireEvent.click(screen.getByText('العربية'))
    const textarea = screen.getByPlaceholderText(/اكتب مراجعتك/)
    expect(textarea).toHaveAttribute('dir', 'rtl')
  })
})

describe('ReviewForm - Character counter', () => {
  it('should show character count for review text', () => {
    render(<ReviewForm {...defaultProps} />)
    // Initial state shows 0/5000
    expect(screen.getByText('0/5000')).toBeInTheDocument()
  })

  it('should update character count as user types', () => {
    render(<ReviewForm {...defaultProps} />)
    const textarea = screen.getByPlaceholderText(/اكتب مراجعتك/)
    fireEvent.change(textarea, { target: { value: 'Hello world test' } })
    expect(screen.getByText('16/5000')).toBeInTheDocument()
  })
})

describe('ReviewForm - Validation', () => {
  it('should disable submit button when review text is too short', () => {
    render(<ReviewForm {...defaultProps} />)
    const submitBtn = screen.getByText('نشر المراجعة')
    expect(submitBtn).toBeDisabled()
  })

  it('should enable submit button when review text is valid', () => {
    render(<ReviewForm {...defaultProps} />)
    const textarea = screen.getByPlaceholderText(/اكتب مراجعتك/)
    fireEvent.change(textarea, { target: { value: 'This is a valid review text that is long enough.' } })
    const submitBtn = screen.getByText('نشر المراجعة')
    expect(submitBtn).not.toBeDisabled()
  })

  it('should show minimum character indicator when text is too short', () => {
    render(<ReviewForm {...defaultProps} />)
    const textarea = screen.getByPlaceholderText(/اكتب مراجعتك/)
    fireEvent.change(textarea, { target: { value: 'Short' } })
    // Should show remaining chars needed
    expect(screen.getByText(/حرف متبقي للحد الأدنى/)).toBeInTheDocument()
  })
})

describe('ReviewForm - Form submission', () => {
  it('should call onSubmit with correct data when form is submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ReviewForm {...defaultProps} onSubmit={onSubmit} />)

    const textarea = screen.getByPlaceholderText(/اكتب مراجعتك/)
    fireEvent.change(textarea, { target: { value: 'This is a valid review text that is long enough to pass validation.' } })

    const submitBtn = screen.getByText('نشر المراجعة')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        review_text: 'This is a valid review text that is long enough to pass validation.',
        language: 'ar',
        contains_spoilers: false
      }))
    })
  })

  it('should call onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(<ReviewForm {...defaultProps} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('إلغاء'))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('ReviewForm - Existing review (edit mode)', () => {
  it('should show "تحديث المراجعة" button in edit mode', () => {
    render(
      <ReviewForm
        {...defaultProps}
        existingReview={{
          id: 'review-1',
          review_text: 'Existing review text here.',
          language: 'en',
          contains_spoilers: false
        }}
      />
    )
    expect(screen.getByText('تحديث المراجعة')).toBeInTheDocument()
  })

  it('should pre-fill review text from existing review', () => {
    render(
      <ReviewForm
        {...defaultProps}
        existingReview={{
          id: 'review-1',
          review_text: 'Existing review text here.',
          language: 'en',
          contains_spoilers: false
        }}
      />
    )
    const textarea = screen.getByDisplayValue('Existing review text here.')
    expect(textarea).toBeInTheDocument()
  })
})
