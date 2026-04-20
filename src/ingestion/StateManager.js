/**
 * StateManager - Ingestion Log State Machine
 * 
 * Manages the lifecycle of ingestion_log entries:
 * pending → processing → success/failed/skipped
 * 
 * Philosophy:
 * - The ingestion_log is the single source of truth for ingestion status
 * - State transitions are atomic and transactional
 * - Retry logic uses exponential backoff
 * - Worker queries use FOR UPDATE SKIP LOCKED to prevent race conditions
 */

const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 1000;

class StateManager {
  /**
   * Claim pending items for processing (Worker Query)
   * Uses FOR UPDATE SKIP LOCKED to prevent multiple workers from claiming the same items
   * 
   * @param {object} client - PostgreSQL client (from pool)
   * @param {number} limit - Maximum number of items to claim (default: 50)
   * @returns {Promise<Array>} - Array of claimed ingestion_log entries
   */
  async claimPendingItems(client, limit = 50) {
    const query = `
      UPDATE ingestion_log
      SET status = 'processing', 
          last_attempted_at = NOW()
      WHERE id IN (
        SELECT id FROM ingestion_log
        WHERE status = 'pending'
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    const result = await client.query(query, [limit]);
    return result.rows;
  }

  /**
   * Mark an item as processing
   * 
   * @param {string} ingestionLogId - UUID of the ingestion_log entry
   * @param {object} client - PostgreSQL client (from pool)
   */
  async setProcessing(ingestionLogId, client) {
    const query = `
      UPDATE ingestion_log
      SET status = 'processing',
          last_attempted_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `;

    await client.query(query, [ingestionLogId]);
  }

  /**
   * Mark an item as successfully processed
   * 
   * @param {string} ingestionLogId - UUID of the ingestion_log entry
   * @param {string} resultId - UUID of the inserted content row
   * @param {string} resultSlug - The final slug assigned
   * @param {object} client - PostgreSQL client (from pool)
   */
  async setSuccess(ingestionLogId, resultId, resultSlug, client) {
    const query = `
      UPDATE ingestion_log
      SET status = 'success',
          processed_at = NOW(),
          result_id = $2,
          result_slug = $3,
          last_error = NULL,
          updated_at = NOW()
      WHERE id = $1
    `;

    await client.query(query, [ingestionLogId, resultId, resultSlug]);
  }

  /**
   * Mark an item as failed with retry logic
   * 
   * @param {string} ingestionLogId - UUID of the ingestion_log entry
   * @param {string} errorMessage - The error message
   * @param {object} client - PostgreSQL client (from pool)
   */
  async setFailed(ingestionLogId, errorMessage, client) {
    // Get current retry_count
    const getRetryQuery = `
      SELECT retry_count FROM ingestion_log WHERE id = $1
    `;
    const retryResult = await client.query(getRetryQuery, [ingestionLogId]);
    const currentRetryCount = retryResult.rows[0]?.retry_count || 0;
    const newRetryCount = currentRetryCount + 1;

    // Calculate next_retry_at using exponential backoff
    let nextRetryAt = null;
    let newStatus = 'failed';

    if (newRetryCount < MAX_RETRIES) {
      // Calculate backoff: RETRY_BACKOFF_BASE_MS × 2^retry_count
      const backoffMs = RETRY_BACKOFF_BASE_MS * Math.pow(2, newRetryCount);
      nextRetryAt = new Date(Date.now() + backoffMs);
      newStatus = 'pending'; // Re-queue for retry
    }
    // else: retry_count >= MAX_RETRIES → permanent failure, stay 'failed'

    const query = `
      UPDATE ingestion_log
      SET status = $2,
          retry_count = $3,
          last_error = $4,
          next_retry_at = $5,
          updated_at = NOW()
      WHERE id = $1
    `;

    await client.query(query, [
      ingestionLogId,
      newStatus,
      newRetryCount,
      errorMessage,
      nextRetryAt
    ]);
  }

  /**
   * Mark an item as skipped (validation failure)
   * Skipped items are NOT retried
   * 
   * @param {string} ingestionLogId - UUID of the ingestion_log entry
   * @param {string} reason - The validation rejection reason
   * @param {object} client - PostgreSQL client (from pool)
   */
  async setSkipped(ingestionLogId, reason, client) {
    const query = `
      UPDATE ingestion_log
      SET status = 'skipped',
          last_error = $2,
          updated_at = NOW()
      WHERE id = $1
    `;

    await client.query(query, [ingestionLogId, `Validation failed: ${reason}`]);
  }

  /**
   * Create a new ingestion_log entry
   * 
   * @param {string} externalSource - 'TMDB', 'RAWG', etc.
   * @param {string} externalId - Source's unique ID
   * @param {string} contentType - 'movie' | 'tv_series' | 'game' | 'software' | 'actor'
   * @param {object} client - PostgreSQL client (from pool)
   * @returns {Promise<string>} - UUID of the created ingestion_log entry
   */
  async createEntry(externalSource, externalId, contentType, client) {
    const query = `
      INSERT INTO ingestion_log (
        external_source,
        external_id,
        content_type,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 'pending', NOW(), NOW())
      ON CONFLICT (external_source, external_id, content_type) 
      DO UPDATE SET 
        status = 'pending',
        updated_at = NOW()
      RETURNING id
    `;

    const result = await client.query(query, [externalSource, externalId, contentType]);
    return result.rows[0].id;
  }

  /**
   * Get statistics about ingestion status
   * 
   * @param {object} client - PostgreSQL client (from pool)
   * @returns {Promise<object>} - Statistics object
   */
  async getStats(client) {
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM ingestion_log
      GROUP BY status
    `;

    const result = await client.query(query);
    
    const stats = {
      pending: 0,
      processing: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };

    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });

    return stats;
  }
}

export default new StateManager();
