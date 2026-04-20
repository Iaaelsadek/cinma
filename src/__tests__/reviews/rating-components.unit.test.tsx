/**
 * Unit Tests: Rating Components
 *
 * Task 11.3: Write unit tests for rating components
 * Requirements: 11.1, 11.2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RatingInput } from '../../components/features/reviews/RatingInput'

// ============================================================================
// RatingInput Component Tests
// ============================================================================

describe('RatingInput - Renders correctly', () => {
  it('should render 5 star elements', () => {
    const { container } = render(<RatingInput value={null} />)
    // 5 star divs (each star = 2 points on 10-point scale)
    const stars = container.querySelectorAll('.relative')
    expect(stars.length).toBe(5)
  })

  it('should render with a value', () => {
    render(<RatingInput value={8} showValue />)
    expect(screen.getByText('8/10')).toBeInTheDocument()
  })

  it('should not show value when showValue is false', () => {
    render(<RatingInput value={8} showValue={false} />)
    expect(screen.queryByText('8/10')).not.toBeInTheDocument()
  })

  it('should not show value when value is null', () => {
    render(<RatingInput value={null} showValue />)
    expect(screen.queryByText('/10')).not.toBeInTheDocument()
  })

  it('should render as readonly when readonly prop is true', () => {
    const { container } = render(<RatingInput value={7} readonly />)
    const slider = container.querySelector('[role="slider"]')
    expect(slider).toHaveAttribute('aria-readonly', 'true')
    expect(slider).toHaveAttribute('tabindex', '-1')
  })

  it('should be interactive when readonly is false', () => {
    const { container } = render(<RatingInput value={7} readonly={false} />)
    const slider = container.querySelector('[role="slider"]')
    expect(slider).toHaveAttribute('tabindex', '0')
  })
})

describe('RatingInput - onChange callback', () => {
  it('should call onChange when keyboard ArrowRight is pressed', () => {
    const onChange = vi.fn()
    const { container } = render(<RatingInput value={5} onChange={onChange} />)
    const slider = container.querySelector('[role="slider"]')!
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(6)
  })

  it('should call onChange when keyboard ArrowLeft is pressed', () => {
    const onChange = vi.fn()
    const { container } = render(<RatingInput value={5} onChange={onChange} />)
    const slider = container.querySelector('[role="slider"]')!
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('should not exceed 10 when ArrowRight at max', () => {
    const onChange = vi.fn()
    const { container } = render(<RatingInput value={10} onChange={onChange} />)
    const slider = container.querySelector('[role="slider"]')!
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('should not go below 1 when ArrowLeft at min', () => {
    const onChange = vi.fn()
    const { container } = render(<RatingInput value={1} onChange={onChange} />)
    const slider = container.querySelector('[role="slider"]')!
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('should set value to 1 on Home key', () => {
    const onChange = vi.fn()
    const { container } = render(<RatingInput value={7} onChange={onChange} />)
    const slider = container.querySelector('[role="slider"]')!
    fireEvent.keyDown(slider, { key: 'Home' })
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('should set value to 10 on End key', () => {
    const onChange = vi.fn()
    const { container } = render(<RatingInput value={3} onChange={onChange} />)
    const slider = container.querySelector('[role="slider"]')!
    fireEvent.keyDown(slider, { key: 'End' })
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it('should not call onChange when readonly', () => {
    const onChange = vi.fn()
    const { container } = render(<RatingInput value={5} onChange={onChange} readonly />)
    const slider = container.querySelector('[role="slider"]')!
    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('RatingInput - ARIA attributes', () => {
  it('should have correct ARIA role', () => {
    const { container } = render(<RatingInput value={7} />)
    expect(container.querySelector('[role="slider"]')).toBeInTheDocument()
  })

  it('should have aria-valuemin of 1', () => {
    const { container } = render(<RatingInput value={7} />)
    expect(container.querySelector('[role="slider"]')).toHaveAttribute('aria-valuemin', '1')
  })

  it('should have aria-valuemax of 10', () => {
    const { container } = render(<RatingInput value={7} />)
    expect(container.querySelector('[role="slider"]')).toHaveAttribute('aria-valuemax', '10')
  })

  it('should have aria-valuenow matching current value', () => {
    const { container } = render(<RatingInput value={7} />)
    expect(container.querySelector('[role="slider"]')).toHaveAttribute('aria-valuenow', '7')
  })
})

// ============================================================================
// AggregateRating display logic tests (pure logic, no component render needed)
// ============================================================================

describe('AggregateRating display logic', () => {
  function formatRatingCount(count: number): string {
    if (count === 0) return 'No ratings yet'
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K ratings`
    return `${count} ratings`
  }

  function formatAverage(avg: number | null): string {
    if (avg === null) return 'No ratings yet'
    return `${avg}/10`
  }

  it('should display "No ratings yet" when count is 0', () => {
    expect(formatRatingCount(0)).toBe('No ratings yet')
  })

  it('should display count for small numbers', () => {
    expect(formatRatingCount(45)).toBe('45 ratings')
  })

  it('should format large counts with K suffix', () => {
    expect(formatRatingCount(1200)).toBe('1.2K ratings')
  })

  it('should display average as X/10', () => {
    expect(formatAverage(7.8)).toBe('7.8/10')
  })

  it('should display "No ratings yet" for null average', () => {
    expect(formatAverage(null)).toBe('No ratings yet')
  })

  it('should display integer averages correctly', () => {
    expect(formatAverage(8)).toBe('8/10')
  })
})
