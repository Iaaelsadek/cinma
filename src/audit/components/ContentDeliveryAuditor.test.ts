
import {describe, it, expect} from 'vitest';
import { ContentDeliveryAuditor } from './ContentDeliveryAuditor';

describe('ContentDeliveryAuditor', () => {
  const auditor = new ContentDeliveryAuditor();

  it('should run image optimization check', { timeout: 30000 }, async () => {
    const report = await auditor.run();
    expect(report.component).toBe('ContentDeliveryAuditor');
    expect(report.metrics.images).toBeDefined();
    expect(report.metrics.images.totalImages).toBeGreaterThanOrEqual(0);
  });

  it('should verify video delivery metrics', { timeout: 30000 }, async () => {
    const report = await auditor.run();
    expect(report.metrics.videos).toBeDefined();
    expect(report.metrics.videos.averageStartTime).toBeLessThanOrEqual(3);
  });

  it('should verify CDN configuration', { timeout: 30000 }, async () => {
    const report = await auditor.run();
    expect(report.metrics.cdn).toBeDefined();
    expect(report.metrics.cdn.staticAssetsOnCDN).toBe(true);
  });
});
