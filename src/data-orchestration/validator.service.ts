import { Injectable, Logger } from '@nestjs/common';
import { UnifiedRecord } from './orchestrator.service';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class ValidatorService {
  private readonly logger = new Logger(ValidatorService.name);

  /**
   * Validate batch of records
   */
  async validateBatch(records: UnifiedRecord[]): Promise<UnifiedRecord[]> {
    const validated: UnifiedRecord[] = [];

    for (const record of records) {
      const result = this.validateRecord(record);

      if (result.valid) {
        validated.push(record);
      } else {
        this.logger.warn(
          `Record ${record.id} failed validation: ${result.errors.join(', ')}`,
        );
      }

      if (result.warnings.length > 0) {
        this.logger.debug(
          `Record ${record.id} warnings: ${result.warnings.join(', ')}`,
        );
      }
    }

    this.logger.log(
      `Validated ${records.length} records, ${validated.length} passed`,
    );

    return validated;
  }

  /**
   * Validate single record
   */
  validateRecord(record: UnifiedRecord): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!record.id) {
      errors.push('Missing required field: id');
    }
    if (!record.type) {
      errors.push('Missing required field: type');
    }
    if (!record.source) {
      errors.push('Missing required field: source');
    }
    if (!record.sourceId) {
      errors.push('Missing required field: sourceId');
    }

    // Type-specific validation
    if (record.type === 'person') {
      this.validatePerson(record, errors, warnings);
    } else if (record.type === 'company') {
      this.validateCompany(record, errors, warnings);
    } else if (record.type === 'location') {
      this.validateLocation(record, errors, warnings);
    }

    // Validate email format
    if (record.email && !this.isValidEmail(record.email)) {
      errors.push('Invalid email format');
    }

    // Validate phone format
    if (record.phone && !this.isValidPhone(record.phone)) {
      warnings.push('Phone number may be invalid');
    }

    // Validate URLs
    if (record.linkedin && !this.isValidUrl(record.linkedin)) {
      warnings.push('LinkedIn URL may be invalid');
    }
    if (record.twitter && !this.isValidUrl(record.twitter)) {
      warnings.push('Twitter URL may be invalid');
    }
    if (record.website && !this.isValidUrl(record.website)) {
      warnings.push('Website URL may be invalid');
    }

    // Validate confidence score
    if (
      record.confidence < 0 ||
      record.confidence > 1 ||
      isNaN(record.confidence)
    ) {
      errors.push('Confidence must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate person record
   */
  private validatePerson(
    record: UnifiedRecord,
    errors: string[],
    warnings: string[],
  ): void {
    // Should have at least one name field
    if (!record.firstName && !record.lastName && !record.fullName) {
      warnings.push('Person record has no name');
    }

    // Should have at least one contact method
    const hasContact = !!(
      record.email ||
      record.phone ||
      record.linkedin
    );
    if (!hasContact) {
      warnings.push('Person record has no contact information');
    }
  }

  /**
   * Validate company record
   */
  private validateCompany(
    record: UnifiedRecord,
    errors: string[],
    warnings: string[],
  ): void {
    // Should have company name
    if (!record.companyName) {
      errors.push('Company record missing company name');
    }

    // Should have at least one contact method
    const hasContact = !!(
      record.website ||
      record.email ||
      record.phone
    );
    if (!hasContact) {
      warnings.push('Company record has no contact information');
    }
  }

  /**
   * Validate location record
   */
  private validateLocation(
    record: UnifiedRecord,
    errors: string[],
    warnings: string[],
  ): void {
    // Should have location name or coordinates
    const hasLocation = !!(record.city || record.coordinates);
    if (!hasLocation) {
      errors.push('Location record has no location data');
    }

    // Validate coordinates if present
    if (record.coordinates) {
      const { lat, lng } = record.coordinates;
      if (
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        errors.push('Invalid coordinates');
      }
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    // Basic check: should have 10+ digits
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Filter records by quality threshold
   */
  async filterByQuality(
    records: UnifiedRecord[],
    minConfidence: number = 0.5,
  ): Promise<UnifiedRecord[]> {
    const filtered = records.filter(
      (record) => record.confidence >= minConfidence,
    );

    this.logger.log(
      `Filtered by quality (min ${minConfidence}): ${records.length} → ${filtered.length} records`,
    );

    return filtered;
  }

  /**
   * Get validation statistics
   */
  getValidationStatistics(
    records: UnifiedRecord[],
  ): {
    total: number;
    byType: Record<string, number>;
    withEmail: number;
    withPhone: number;
    withLinkedIn: number;
    averageConfidence: number;
  } {
    const byType: Record<string, number> = {};

    for (const record of records) {
      byType[record.type] = (byType[record.type] || 0) + 1;
    }

    const withEmail = records.filter((r) => !!r.email).length;
    const withPhone = records.filter((r) => !!r.phone).length;
    const withLinkedIn = records.filter((r) => !!r.linkedin).length;

    const avgConfidence =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.confidence, 0) / records.length
        : 0;

    return {
      total: records.length,
      byType,
      withEmail,
      withPhone,
      withLinkedIn,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
    };
  }
}
