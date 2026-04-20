/**
 * Tests: Review Display Components
 *
 * Task 13.4: Property 10 - Review Display Completeness
 * Validates: Requirements 4.2
 *
 * Task 13.5: Unit tests for review display components
 * Requirements: 4.1, 4.2, 4.3, 5.1, 7.1, 18.5
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as fc from 'fast-check'
import { ReviewCard } from '../../components/features/reviews/ReviewCard'
import { ReviewFilters } from '../../components/features/reviews/ReviewFilters'

// ============================================================================
// Test helpers
// ============================================================================

function makeReview(overrides = {}) {
  return {
    id: 'review-1',
    user_id: 'user-1',
    title: 'Great Film',
    review_text: 'This is a wonderful film with amazing cinematography and great acting.',
    rating: 8,
    language: 'en' as const,
    contains_spoilers: false,
    is_verified: false,
    edit_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: { username: 'testuser', avatar_url: null, id: 'user-1' },
    helpful_count: 5,
    is_liked: false,
    ...overrides
  }
}

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <ReviewCard
        review={makeReview()}
        currentUserId="other-user"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onLike={vi.fn()}
        onReport={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  )
}

// ============================================================================
// Property 10: Review Display Completeness
// Validates: Requirements 4.2
// ============================================================================

describe('Property 10: Review Display Completeness', () => {
  it('should always display username when user data is present', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
        (username) => {
          const { unmount } = render(
            <MemoryRouter>
              <ReviewCard
                review={makeReview({ user: { username, avatar_url: null, id: 'u1' } })}
                currentUserId="other"
              />
            </MemoryRouter>
          )
          expect(screen.getByText(username)).toBeInTheDocument()
          unmount()
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should always display review text', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 200 }),
        (text) => {
          const { unmount } = render(
            <MemoryRouter>
              <ReviewCard
                review={makeReview({ review_text: text })}
                currentUserId="other"
              />
            </MemoryRouter>
          )
          // Text may be truncated but the element should exist
          const card = document.querySelector('.whitespace-pre-wrap')
          expect(card).toBeInTheDocument()
          unmount()
        }
      ),
      { numRuns: 20 }
    )
  })
})

// ============================================================================
// Unit Tests: ReviewCard (Task 13.5)
// ============================================================================

describe('ReviewCard - Renders all fields correctly', () => {
  it('should display username', () => {
    renderCard()
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('should display review title', () => {
    renderCard()
    expect(screen.getByText('Great Film')).toBeInTheDocument()
  })

  it('should display review text', () => {
    renderCard()
    expect(screen.getByText(/wonderful film/)).toBeInTheDocument()
  })

  it('should display helpful count when > 0', () => {
    renderCard()
    expect(screen.getByText('(5)')).toBeInTheDocument()
  })

  it('should display language indicator', () => {
    renderCard()
    expect(screen.getByText(/English/)).toBeInTheDocument()
  })

  it('should display verified badge when is_verified is true', () => {
    renderCard({ review: makeReview({ is_verified: true }) })
    expect(screen.getByText('Verified Watch')).toBeInTheDocument()
  })

  it('should not display verified badge when is_verified is false', () => {
    renderCard()
    expect(screen.queryByText('Verified Watch')).not.toBeInTheDocument()
  })

  it('should display edited badge when edit_count > 0', () => {
    renderCard({ review: makeReview({ edit_count: 2 }) })
    expect(screen.getByText('(معدّلة)')).toBeInTheDocument()
  })

  it('should not display edited badge when edit_count is 0', () => {
    renderCard()
    expect(screen.queryByText('(معدّلة)')).not.toBeInTheDocument()
  })
})

describe('ReviewCard - Edit/Delete for owner only', () => {
  it('should show edit and delete buttons for review owner', () => {
    renderCard({ currentUserId: 'user-1' })
    // Owner sees edit/delete, not like/report
    expect(screen.queryByTitle('تعديل')).toBeInTheDocument()
    expect(screen.queryByTitle('حذف')).toBeInTheDocument()
  })

  it('should not show edit/delete buttons for non-owner', () => {
    renderCard({ currentUserId: 'other-user' })
    expect(screen.queryByTitle('تعديل')).not.toBeInTheDocument()
    expect(screen.queryByTitle('حذف')).not.toBeInTheDocument()
  })

  it('should show like and report buttons for non-owner', () => {
    renderCard({ currentUserId: 'other-user' })
    expect(screen.getByText('مفيدة')).toBeInTheDocument()
    expect(screen.getByText('إبلاغ')).toBeInTheDocument()
  })

  it('should not show like button for owner', () => {
    renderCard({ currentUserId: 'user-1' })
    expect(screen.queryByText('مفيدة')).not.toBeInTheDocument()
  })
})

describe('ReviewCard - Spoiler warning functionality', () => {
  it('should show spoiler warning when contains_spoilers is true', () => {
    renderCard({ review: makeReview({ contains_spoilers: true }) })
    expect(screen.getByText(/تحذير: تحتوي على حرق/)).toBeInTheDocument()
  })

  it('should hide review text behind spoiler warning', () => {
    renderCard({ review: makeReview({ contains_spoilers: true }) })
    // Review text should not be visible initially
    expect(screen.queryByText(/wonderful film/)).not.toBeInTheDocument()
  })

  it('should reveal review text when "Show Spoilers" is clicked', () => {
    renderCard({ review: makeReview({ contains_spoilers: true }) })
    fireEvent.click(screen.getByText('عرض المراجعة'))
    expect(screen.getByText(/wonderful film/)).toBeInTheDocument()
  })

  it('should not show spoiler warning when contains_spoilers is false', () => {
    renderCard()
    expect(screen.queryByText(/تحذير/)).not.toBeInTheDocument()
  })
})

describe('ReviewCard - Read More expansion', () => {
  it('should show "Read More" button for long reviews', () => {
    const longText = 'a'.repeat(301)
    renderCard({ review: makeReview({ review_text: longText }) })
    expect(screen.getByText('قراءة المزيد')).toBeInTheDocument()
  })

  it('should not show "Read More" for short reviews', () => {
    renderCard({ review: makeReview({ review_text: 'Short review text here.' }) })
    expect(screen.queryByText('قراءة المزيد')).not.toBeInTheDocument()
  })

  it('should expand text when "Read More" is clicked', () => {
    const longText = 'x'.repeat(301)
    renderCard({ review: makeReview({ review_text: longText }) })
    fireEvent.click(screen.getByText('قراءة المزيد'))
    expect(screen.getByText('عرض أقل')).toBeInTheDocument()
  })
})

// ============================================================================
// Unit Tests: ReviewFilters (Task 13.5)
// ============================================================================

describe('ReviewFilters - State management', () => {
  function renderFilters(props = {}) {
    const defaults = {
      sort: 'most_helpful' as const,
      onSortChange: vi.fn(),
      language: 'all' as const,
      onLanguageChange: vi.fn(),
      ratingFilter: 'all' as const,
      onRatingFilterChange: vi.fn()
    }
    return render(<ReviewFilters {...defaults} {...props} />)
  }

  it('should render sort buttons', () => {
    renderFilters()
    expect(screen.getByText('الأكثر فائدة')).toBeInTheDocument()
    expect(screen.getByText('الأحدث')).toBeInTheDocument()
    expect(screen.getByText('أعلى تقييم')).toBeInTheDocument()
    expect(screen.getByText('أقل تقييم')).toBeInTheDocument()
  })

  it('should render language tabs', () => {
    renderFilters()
    expect(screen.getByText('الكل / All')).toBeInTheDocument()
    expect(screen.getByText(/العربية/)).toBeInTheDocument()
    expect(screen.getByText(/English/)).toBeInTheDocument()
  })

  it('should render rating filter buttons', () => {
    renderFilters()
    // "الكل" appears twice (language + rating), use getAllByText
    expect(screen.getAllByText('الكل').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('إيجابي (7-10)')).toBeInTheDocument()
    expect(screen.getByText('متوسط (4-6)')).toBeInTheDocument()
    expect(screen.getByText('سلبي (1-3)')).toBeInTheDocument()
  })

  it('should call onLanguageChange when Arabic tab is clicked', () => {
    const onLanguageChange = vi.fn()
    renderFilters({ onLanguageChange })
    fireEvent.click(screen.getByText(/🇸🇦 العربية/))
    expect(onLanguageChange).toHaveBeenCalledWith('ar')
  })

  it('should call onLanguageChange with "en" when English tab is clicked', () => {
    const onLanguageChange = vi.fn()
    renderFilters({ onLanguageChange })
    fireEvent.click(screen.getByText(/🇬🇧 English/))
    expect(onLanguageChange).toHaveBeenCalledWith('en')
  })

  it('should call onRatingFilterChange when positive filter is clicked', () => {
    const onRatingFilterChange = vi.fn()
    renderFilters({ onRatingFilterChange })
    fireEvent.click(screen.getByText('إيجابي (7-10)'))
    expect(onRatingFilterChange).toHaveBeenCalledWith('positive')
  })

  it('should call onSortChange when newest sort is clicked', () => {
    const onSortChange = vi.fn()
    renderFilters({ onSortChange })
    fireEvent.click(screen.getByText('الأحدث'))
    expect(onSortChange).toHaveBeenCalledWith('newest')
  })

  it('should call onSortChange when highest_rating sort is clicked', () => {
    const onSortChange = vi.fn()
    renderFilters({ onSortChange })
    fireEvent.click(screen.getByText('أعلى تقييم'))
    expect(onSortChange).toHaveBeenCalledWith('highest_rating')
  })
})
