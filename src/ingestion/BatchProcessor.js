/**
 * BatchProcessor - Batch Orchestration for Ingestion
 * 
 * Coordinates the ingestion pipeline:
 * 1. Claim pending items from ingestion_log
 * 2. Fetch content from adapters (with concurrency control)
 * 3. Validate content
 * 4. Write to database via CoreIngestor
 * 5. Update ingestion_log status
 * 
 * Philosophy:
 * - Batch processing for efficiency
 * - Concurrency control to respect API rate limits
 * - Individual item failures don't abort the batch
 * - Wait between batches to prevent overload
 */

import pLimit from 'p-limit';
import pool from '../db/pool.js';
import StateManager from './StateManager.js';
import ContentValidator from '../validation/ContentValidator.js';
import CoreIngestor from './CoreIngestor.js';

const BATCH_SIZE = 50;
const MAX_CONCURRENT_FETCHES = 10;
const WAIT_BETWEEN_BATCHES_MS = 200;

class BatchProcessor {
  constructor(adapter, validatorConfig = {}) {
    this.adapter = adapter;
    this.validator = new ContentValidator(validatorConfig);
    this.isProcessing = false;
  }

  /**
   * Process a single batch of pending items
   * 
   * @returns {Promise<Object>} - { processed, succeeded, failed, skipped }
   */
  async processBatch() {
    if (this.isProcessing) {
      return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    this.isProcessing = true;

    try {
      // Step 1: Claim pending items
      const client = await pool.connect();
      let pendingItems;
      
      try {
        pendingItems = await StateManager.claimPendingItems(client, BATCH_SIZE);
      } finally {
        client.release();
      }

      if (pendingItems.length === 0) {
        console.log('ℹ️  No pending items to process');
        return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
      }

      console.log(`📦 Processing batch of ${pendingItems.length} items`);

      // Step 2: Fetch content with concurrency control
      const limit = pLimit(MAX_CONCURRENT_FETCHES);
      const fetchPromises = pendingItems.map(item =>
        limit(() => this._fetchAndValidate(item))
      );

      const fetchResults = await Promise.allSettled(fetchPromises);

      // Step 3: Separate valid items from skipped/failed
      const validItems = [];
      const validLogIds = [];
      let skippedCount = 0;
      let fetchFailedCount = 0;

      for (let i = 0; i < fetchResults.length; i++) {
        const result = fetchResults[i];
        const logItem = pendingItems[i];

        if (result.status === 'fulfilled') {
          const { content, validationResult } = result.value;

          if (validationResult.valid) {
            validItems.push(content);
            validLogIds.push(logItem.id);
          } else {
            // Validation failed - mark as skipped
            skippedCount++;
            const client = await pool.connect();
            try {
              await StateManager.setSkipped(logItem.id, validationResult.reason, client);
            } finally {
              client.release();
            }
          }
        } else {
          // Fetch failed
          fetchFailedCount++;
          const client = await pool.connect();
          try {
            await StateManager.setFailed(logItem.id, result.reason.message, client);
          } finally {
            client.release();
          }
        }
      }

      // Step 4: Write valid items to database
      let writeResult = { successCount: 0, failedCount: 0, skippedCount: 0 };
      
      if (validItems.length > 0) {
        writeResult = await CoreIngestor.writeBatch(validItems, validLogIds);
      }

      // Step 5: Calculate final stats
      const stats = {
        processed: pendingItems.length,
        succeeded: writeResult.successCount,
        failed: fetchFailedCount + writeResult.failedCount,
        skipped: skippedCount + writeResult.skippedCount
      };

      return stats;

    } catch (error) {
      console.error('❌ Batch processing error:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process batches continuously until queue is empty
   * 
   * @param {number} maxBatches - Maximum number of batches to process (0 = unlimited)
   * @returns {Promise<Object>} - Aggregate stats
   */
  async processAll(maxBatches = 0) {
    
    const aggregateStats = {
      totalProcessed: 0,
      totalSucceeded: 0,
      totalFailed: 0,
      totalSkipped: 0,
      batchesProcessed: 0
    };

    let batchCount = 0;

    while (true) {
      // Check if we've reached max batches
      if (maxBatches > 0 && batchCount >= maxBatches) {
        break;
      }

      // Process one batch
      const stats = await this.processBatch();

      // Update aggregate stats
      aggregateStats.totalProcessed += stats.processed;
      aggregateStats.totalSucceeded += stats.succeeded;
      aggregateStats.totalFailed += stats.failed;
      aggregateStats.totalSkipped += stats.skipped;
      aggregateStats.batchesProcessed++;
      batchCount++;

      // If no items were processed, queue is empty
      if (stats.processed === 0) {
        console.log('✅ Queue is empty, stopping');
        break;
      }

      // Wait between batches
      console.log(`⏳ Waiting ${WAIT_BETWEEN_BATCHES_MS}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, WAIT_BETWEEN_BATCHES_MS));
    }

    console.log('🎉 Continuous processing complete');
    console.log(`📊 Total: ${aggregateStats.totalProcessed} processed, ${aggregateStats.totalSucceeded} succeeded, ${aggregateStats.totalFailed} failed, ${aggregateStats.totalSkipped} skipped`);

    return aggregateStats;
  }

  /**
   * Fetch content from adapter and validate
   * 
   * @param {object} logItem - ingestion_log entry
   * @returns {Promise<Object>} - { content, validationResult }
   * @private
   */
  async _fetchAndValidate(logItem) {
    // Fetch from adapter
    const content = await this.adapter.fetchOne(
      logItem.external_id,
      logItem.content_type
    );

    // Validate
    const validationResult = this.validator.validate(content);

    return { content, validationResult };
  }

  /**
   * Get current processing status
   * 
   * @returns {boolean}
   */
  isCurrentlyProcessing() {
    return this.isProcessing;
  }

  /**
   * Get ingestion statistics
   * 
   * @returns {Promise<Object>}
   */
  async getStats() {
    const client = await pool.connect();
    try {
      return await StateManager.getStats(client);
    } finally {
      client.release();
    }
  }

  /**
   * Queue new items for ingestion
   * 
   * @param {Array<Object>} items - [{ externalSource, externalId, contentType }]
   * @returns {Promise<number>} - Number of items queued
   */
  async queueItems(items) {
    if (!items || items.length === 0) {
      return 0;
    }

    const client = await pool.connect();
    let queuedCount = 0;

    try {
      await client.query('BEGIN');

      for (const item of items) {
        try {
          await StateManager.createEntry(
            item.externalSource,
            item.externalId,
            item.contentType,
            client
          );
          queuedCount++;
        } catch (error) {
          console.error(`Failed to queue item ${item.externalId}:`, error.message);
        }
      }

      await client.query('COMMIT');

      return queuedCount;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Re-queue failed items (retry_count < MAX_RETRIES)
   * 
   * @returns {Promise<number>} - Number of items re-queued
   */
  async requeueFailed() {
    const client = await pool.connect();

    try {
      const query = `
        UPDATE ingestion_log
        SET status = 'pending',
            next_retry_at = NULL,
            updated_at = NOW()
        WHERE status = 'failed'
          AND retry_count < 3
        RETURNING id
      `;

      const result = await client.query(query);
      const count = result.rows.length;

      return count;

    } finally {
      client.release();
    }
  }
}

export default BatchProcessor;
