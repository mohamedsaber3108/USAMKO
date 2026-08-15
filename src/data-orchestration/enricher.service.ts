import { Injectable, Logger } from '@nestjs/common';
import { UnifiedRecord } from './orchestrator.service';

@Injectable()
export class EnricherService {
  private readonly logger = new Logger(EnricherService.name);

  /**
   * Enrich batch of records
   */
  async enrichBatch(records: UnifiedRecord[]): Promise<UnifiedRecord[]> {
    return Promise.all(records.map((record) => this.enrichRecord(record)));
  }

  /**
   * Enrich single record with computed fields
   */
  private async enrichRecord(
    record: UnifiedRecord,
  ): Promise<UnifiedRecord> {
    const enriched = { ...record };

    // Enrich email domain
    if (enriched.email && !enriched.companyDomain) {
      enriched.companyDomain = this.extractEmailDomain(enriched.email);
    }

    // Enrich full name
    if (!enriched.fullName && enriched.firstName && enriched.lastName) {
      enriched.fullName = `${enriched.firstName} ${enriched.lastName}`;
    }

    // Enrich LinkedIn URL from public identifier
    if (!enriched.linkedin && enriched.sourceId && enriched.source === 'linkedin') {
      enriched.linkedin = `https://linkedin.com/in/${enriched.sourceId}`;
    }

    // Compute data completeness score
    enriched.confidence = this.calculateCompleteness(enriched);

    return enriched;
  }

  /**
   * Extract domain from email
   */
  private extractEmailDomain(email: string): string {
    const parts = email.split('@');
    return parts[1] || '';
  }

  /**
   * Calculate record completeness/confidence score
   */
  private calculateCompleteness(record: UnifiedRecord): number {
    let score = 0;
    let maxScore = 0;

    // Person-specific fields
    if (record.type === 'person') {
      maxScore = 10;

      if (record.firstName) score += 1;
      if (record.lastName) score += 1;
      if (record.email) score += 2;
      if (record.phone) score += 1;
      if (record.title) score += 1;
      if (record.companyName) score += 1;
      if (record.linkedin) score += 2;
      if (record.city) score += 0.5;
      if (record.state) score += 0.5;
    }

    // Company-specific fields
    if (record.type === 'company') {
      maxScore = 8;

      if (record.companyName) score += 2;
      if (record.website) score += 2;
      if (record.companyDomain) score += 1;
      if (record.email) score += 1;
      if (record.phone) score += 1;
      if (record.city) score += 0.5;
      if (record.state) score += 0.5;
    }

    // Location-specific fields
    if (record.type === 'location') {
      maxScore = 6;

      if (record.city) score += 1;
      if (record.state) score += 1;
      if (record.country) score += 1;
      if (record.coordinates) score += 2;
      if (record.companyName) score += 1;
    }

    // Calculate percentage
    const completeness = maxScore > 0 ? score / maxScore : 0;

    // Factor in original confidence
    const finalScore = (completeness + (record.confidence || 0.5)) / 2;

    return Math.min(1, Math.max(0, finalScore));
  }

  /**
   * Enrich with AI-generated insights
   * TODO: Implement AI-based enrichment
   */
  async enrichWithAI(records: UnifiedRecord[]): Promise<UnifiedRecord[]> {
    this.logger.debug('AI enrichment not yet implemented');
    return records;
  }

  /**
   * Enrich with external API data
   * TODO: Implement external API enrichment
   */
  async enrichWithExternalAPIs(
    records: UnifiedRecord[],
  ): Promise<UnifiedRecord[]> {
    this.logger.debug('External API enrichment not yet implemented');
    return records;
  }

  /**
   * Score record quality
   */
  scoreQuality(record: UnifiedRecord): {
    score: number;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let score = 0;

    // Check required fields
    if (record.type === 'person') {
      if (record.firstName && record.lastName) {
        score += 20;
        reasons.push('Has full name');
      }

      if (record.email) {
        score += 30;
        reasons.push('Has email');
      }

      if (record.linkedin) {
        score += 20;
        reasons.push('Has LinkedIn');
      }

      if (record.companyName) {
        score += 15;
        reasons.push('Has company');
      }

      if (record.title) {
        score += 10;
        reasons.push('Has title');
      }

      if (record.phone) {
        score += 5;
        reasons.push('Has phone');
      }
    }

    return {
      score: Math.min(100, score),
      reasons,
    };
  }

  /**
   * Get enrichment statistics
   */
  getEnrichmentStatistics(
    before: UnifiedRecord[],
    after: UnifiedRecord[],
  ): {
    totalRecords: number;
    fieldsAdded: number;
    averageCompleteness: {
      before: number;
      after: number;
      improvement: number;
    };
  } {
    const countFields = (record: UnifiedRecord) => {
      return Object.values(record).filter((v) => v !== null && v !== undefined)
        .length;
    };

    const fieldsBefore = before.reduce(
      (sum, r) => sum + countFields(r),
      0,
    );
    const fieldsAfter = after.reduce((sum, r) => sum + countFields(r), 0);

    const avgCompleteBefore =
      before.length > 0
        ? before.reduce((sum, r) => sum + r.confidence, 0) / before.length
        : 0;

    const avgCompleteAfter =
      after.length > 0
        ? after.reduce((sum, r) => sum + r.confidence, 0) / after.length
        : 0;

    return {
      totalRecords: after.length,
      fieldsAdded: fieldsAfter - fieldsBefore,
      averageCompleteness: {
        before: Math.round(avgCompleteBefore * 100) / 100,
        after: Math.round(avgCompleteAfter * 100) / 100,
        improvement:
          Math.round((avgCompleteAfter - avgCompleteBefore) * 100) / 100,
      },
    };
  }
}
