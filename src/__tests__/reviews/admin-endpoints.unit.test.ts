/**
 * Unit Tests: Admin Endpoints Logic
 *
 * Task 8.6: Write unit tests for admin endpoints
 * Requirements: 14.2, 14.4, 14.5, 24.4
 */

import { describe, it, expect } from 'vitest'

// ============================================================================
// Role-based access control helper
// ============================================================================

type Role = 'user' | 'admin' | 'supervisor'

function canModerate(role: Role): boolean {
  return role === 'admin' || role === 'supervisor'
}

// ============================================================================
// In-memory admin review store
// ============================================================================

interface AdminReview {
  id: string
  user_id: string
  external_id: string
  content_type: string
  review_text: string
  is_hidden: boolean
  created_at: string
}

interface Report {
  id: string
  review_id: string
  reporter_user_id: string
  reason: string
  status: 'pending' | 'reviewed' | 'dismissed'
  reviewed_by?: string
  reviewed_at?: string
}

function createAdminStore() {
  const reviews = new Map<string, AdminReview>()
  const reports = new Map<string, Report>()
  let reviewIdCounter = 1
  let reportIdCounter = 1

  function addReview(review: Omit<AdminReview, 'id' | 'created_at'>): AdminReview {
    const r: AdminReview = {
      ...review,
      id: String(reviewIdCounter++),
      created_at: new Date().toISOString()
    }
    reviews.set(r.id, r)
    return r
  }

  function getAllReviews(includeHidden = true): AdminReview[] {
    const all = Array.from(reviews.values())
    return includeHidden ? all : all.filter(r => !r.is_hidden)
  }

  function hideReview(id: string, moderatorRole: Role): { success: boolean; error?: string } {
    if (!canModerate(moderatorRole)) return { success: false, error: 'Insufficient permissions' }
    const review = reviews.get(id)
    if (!review) return { success: false, error: 'Review not found' }
    review.is_hidden = true
    return { success: true }
  }

  function unhideReview(id: string, moderatorRole: Role): { success: boolean; error?: string } {
    if (!canModerate(moderatorRole)) return { success: false, error: 'Insufficient permissions' }
    const review = reviews.get(id)
    if (!review) return { success: false, error: 'Review not found' }
    review.is_hidden = false
    return { success: true }
  }

  function addReport(report: Omit<Report, 'id'>): Report {
    const r: Report = { ...report, id: String(reportIdCounter++) }
    reports.set(r.id, r)
    return r
  }

  function getAllReports(statusFilter?: string): Report[] {
    const all = Array.from(reports.values())
    if (statusFilter) return all.filter(r => r.status === statusFilter)
    return all
  }

  function updateReportStatus(
    id: string,
    status: 'reviewed' | 'dismissed',
    moderatorId: string,
    moderatorRole: Role
  ): { success: boolean; error?: string } {
    if (!canModerate(moderatorRole)) return { success: false, error: 'Insufficient permissions' }
    const report = reports.get(id)
    if (!report) return { success: false, error: 'Report not found' }
    report.status = status
    report.reviewed_by = moderatorId
    report.reviewed_at = new Date().toISOString()
    return { success: true }
  }

  return { addReview, getAllReviews, hideReview, unhideReview, addReport, getAllReports, updateReportStatus }
}

// ============================================================================
// Tests: Admin Can View All Reviews Including Hidden (Req 14.4)
// ============================================================================

describe('Admin View All Reviews', () => {
  it('should return all reviews including hidden ones for admin', () => {
    const store = createAdminStore()
    store.addReview({ user_id: 'u1', external_id: '550', content_type: 'movie', review_text: 'Visible review text here.', is_hidden: false })
    store.addReview({ user_id: 'u2', external_id: '551', content_type: 'movie', review_text: 'Hidden review text here.', is_hidden: true })

    const all = store.getAllReviews(true)
    expect(all.length).toBe(2)
  })

  it('should return only visible reviews when includeHidden=false', () => {
    const store = createAdminStore()
    store.addReview({ user_id: 'u1', external_id: '550', content_type: 'movie', review_text: 'Visible review text here.', is_hidden: false })
    store.addReview({ user_id: 'u2', external_id: '551', content_type: 'movie', review_text: 'Hidden review text here.', is_hidden: true })

    const visible = store.getAllReviews(false)
    expect(visible.length).toBe(1)
    expect(visible[0].is_hidden).toBe(false)
  })
})

// ============================================================================
// Tests: Admin Can Hide/Unhide Reviews (Req 14.2, 14.5)
// ============================================================================

describe('Admin Hide/Unhide Reviews', () => {
  it('should allow admin to hide a review', () => {
    const store = createAdminStore()
    const review = store.addReview({ user_id: 'u1', external_id: '550', content_type: 'movie', review_text: 'Review text here.', is_hidden: false })

    const result = store.hideReview(review.id, 'admin')
    expect(result.success).toBe(true)

    const all = store.getAllReviews(true)
    expect(all.find(r => r.id === review.id)!.is_hidden).toBe(true)
  })

  it('should allow supervisor to hide a review', () => {
    const store = createAdminStore()
    const review = store.addReview({ user_id: 'u1', external_id: '550', content_type: 'movie', review_text: 'Review text here.', is_hidden: false })

    const result = store.hideReview(review.id, 'supervisor')
    expect(result.success).toBe(true)
  })

  it('should allow admin to unhide a review', () => {
    const store = createAdminStore()
    const review = store.addReview({ user_id: 'u1', external_id: '550', content_type: 'movie', review_text: 'Review text here.', is_hidden: true })

    const result = store.unhideReview(review.id, 'admin')
    expect(result.success).toBe(true)

    const all = store.getAllReviews(true)
    expect(all.find(r => r.id === review.id)!.is_hidden).toBe(false)
  })

  it('should return error for non-existent review', () => {
    const store = createAdminStore()
    const result = store.hideReview('nonexistent', 'admin')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

// ============================================================================
// Tests: Non-Admin Cannot Access Admin Endpoints (Req 14.5)
// ============================================================================

describe('Non-Admin Access Prevention', () => {
  it('should reject hide attempt by regular user', () => {
    const store = createAdminStore()
    const review = store.addReview({ user_id: 'u1', external_id: '550', content_type: 'movie', review_text: 'Review text here.', is_hidden: false })

    const result = store.hideReview(review.id, 'user')
    expect(result.success).toBe(false)
    expect(result.error).toContain('permissions')
  })

  it('should reject unhide attempt by regular user', () => {
    const store = createAdminStore()
    const review = store.addReview({ user_id: 'u1', external_id: '550', content_type: 'movie', review_text: 'Review text here.', is_hidden: true })

    const result = store.unhideReview(review.id, 'user')
    expect(result.success).toBe(false)
    expect(result.error).toContain('permissions')
  })

  it('should reject report status update by regular user', () => {
    const store = createAdminStore()
    const report = store.addReport({ review_id: 'r1', reporter_user_id: 'u2', reason: 'Offensive content here.', status: 'pending' })

    const result = store.updateReportStatus(report.id, 'reviewed', 'u3', 'user')
    expect(result.success).toBe(false)
    expect(result.error).toContain('permissions')
  })

  it('canModerate should return true only for admin and supervisor', () => {
    expect(canModerate('admin')).toBe(true)
    expect(canModerate('supervisor')).toBe(true)
    expect(canModerate('user')).toBe(false)
  })
})

// ============================================================================
// Tests: Admin View and Update Reports (Req 24.4)
// ============================================================================

describe('Admin View and Update Reports', () => {
  it('should return all reports', () => {
    const store = createAdminStore()
    store.addReport({ review_id: 'r1', reporter_user_id: 'u1', reason: 'Offensive content here.', status: 'pending' })
    store.addReport({ review_id: 'r2', reporter_user_id: 'u2', reason: 'Spam content here.', status: 'reviewed' })

    const all = store.getAllReports()
    expect(all.length).toBe(2)
  })

  it('should filter reports by status', () => {
    const store = createAdminStore()
    store.addReport({ review_id: 'r1', reporter_user_id: 'u1', reason: 'Offensive content here.', status: 'pending' })
    store.addReport({ review_id: 'r2', reporter_user_id: 'u2', reason: 'Spam content here.', status: 'reviewed' })
    store.addReport({ review_id: 'r3', reporter_user_id: 'u3', reason: 'Misleading content here.', status: 'pending' })

    const pending = store.getAllReports('pending')
    expect(pending.length).toBe(2)
    expect(pending.every(r => r.status === 'pending')).toBe(true)
  })

  it('should allow admin to update report status to reviewed', () => {
    const store = createAdminStore()
    const report = store.addReport({ review_id: 'r1', reporter_user_id: 'u1', reason: 'Offensive content here.', status: 'pending' })

    const result = store.updateReportStatus(report.id, 'reviewed', 'admin1', 'admin')
    expect(result.success).toBe(true)

    const updated = store.getAllReports().find(r => r.id === report.id)!
    expect(updated.status).toBe('reviewed')
    expect(updated.reviewed_by).toBe('admin1')
    expect(updated.reviewed_at).toBeDefined()
  })

  it('should allow admin to dismiss a report', () => {
    const store = createAdminStore()
    const report = store.addReport({ review_id: 'r1', reporter_user_id: 'u1', reason: 'Offensive content here.', status: 'pending' })

    const result = store.updateReportStatus(report.id, 'dismissed', 'admin1', 'admin')
    expect(result.success).toBe(true)

    const updated = store.getAllReports().find(r => r.id === report.id)!
    expect(updated.status).toBe('dismissed')
  })

  it('should return error for non-existent report', () => {
    const store = createAdminStore()
    const result = store.updateReportStatus('nonexistent', 'reviewed', 'admin1', 'admin')
    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})
