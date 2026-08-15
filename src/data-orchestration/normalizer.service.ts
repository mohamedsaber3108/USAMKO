import { Injectable, Logger } from '@nestjs/common';
import { UnifiedRecord } from './orchestrator.service';

@Injectable()
export class NormalizerService {
  private readonly logger = new Logger(NormalizerService.name);

  /**
   * Normalize records to unified schema
   */
  async normalize(records: UnifiedRecord[]): Promise<UnifiedRecord[]> {
    return records.map((record) => this.normalizeRecord(record));
  }

  /**
   * Normalize single record
   */
  private normalizeRecord(record: UnifiedRecord): UnifiedRecord {
    return {
      ...record,
      // Normalize names
      fullName: this.normalizeFullName(record),
      firstName: this.normalizeName(record.firstName),
      lastName: this.normalizeName(record.lastName),

      // Normalize email
      email: this.normalizeEmail(record.email),

      // Normalize phone
      phone: this.normalizePhone(record.phone),

      // Normalize URLs
      linkedin: this.normalizeUrl(record.linkedin),
      twitter: this.normalizeUrl(record.twitter),
      website: this.normalizeUrl(record.website),

      // Normalize company
      companyName: this.normalizeCompanyName(record.companyName),

      // Normalize location
      city: this.normalizeLocation(record.city),
      state: this.normalizeLocation(record.state),
      country: this.normalizeCountry(record.country),

      // Update timestamp
      lastUpdated: new Date(),
    };
  }

  /**
   * Normalize full name
   */
  private normalizeFullName(record: UnifiedRecord): string {
    if (record.fullName) {
      return this.titleCase(record.fullName.trim());
    }

    if (record.firstName && record.lastName) {
      return `${this.titleCase(record.firstName)} ${this.titleCase(record.lastName)}`;
    }

    if (record.firstName) {
      return this.titleCase(record.firstName);
    }

    if (record.lastName) {
      return this.titleCase(record.lastName);
    }

    return '';
  }

  /**
   * Normalize name (first/last)
   */
  private normalizeName(name?: string): string | undefined {
    if (!name) return undefined;
    return this.titleCase(name.trim());
  }

  /**
   * Normalize email address
   */
  private normalizeEmail(email?: string): string | undefined {
    if (!email) return undefined;

    // Lowercase and trim
    let normalized = email.toLowerCase().trim();

    // Remove display name if present: "Name <email@domain.com>" → "email@domain.com"
    const match = normalized.match(/<(.+)>/);
    if (match) {
      normalized = match[1];
    }

    // Validate basic email format
    if (!this.isValidEmail(normalized)) {
      return undefined;
    }

    return normalized;
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // US number: 10 digits
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // International: 11+ digits with country code
    if (digits.length >= 11) {
      return `+${digits}`;
    }

    return phone; // Return as-is if can't normalize
  }

  /**
   * Normalize URL
   */
  private normalizeUrl(url?: string): string | undefined {
    if (!url) return undefined;

    let normalized = url.trim();

    // Add https:// if missing protocol
    if (!normalized.match(/^https?:\/\//i)) {
      normalized = `https://${normalized}`;
    }

    try {
      const parsed = new URL(normalized);
      return parsed.href;
    } catch {
      return url; // Return original if invalid URL
    }
  }

  /**
   * Normalize company name
   */
  private normalizeCompanyName(name?: string): string | undefined {
    if (!name) return undefined;

    let normalized = name.trim();

    // Remove common suffixes for matching
    const suffixes = [
      ', Inc.',
      ' Inc.',
      ', LLC',
      ' LLC',
      ', Corp.',
      ' Corp.',
      ', Ltd.',
      ' Ltd.',
    ];

    for (const suffix of suffixes) {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.slice(0, -suffix.length);
      }
    }

    return normalized.trim();
  }

  /**
   * Normalize location (city, state)
   */
  private normalizeLocation(location?: string): string | undefined {
    if (!location) return undefined;
    return this.titleCase(location.trim());
  }

  /**
   * Normalize country
   */
  private normalizeCountry(country?: string): string | undefined {
    if (!country) return undefined;

    const normalized = country.trim().toUpperCase();

    // Map common variations to ISO codes
    const countryMap: Record<string, string> = {
      USA: 'US',
      'UNITED STATES': 'US',
      'UNITED STATES OF AMERICA': 'US',
      UK: 'GB',
      'UNITED KINGDOM': 'GB',
      ENGLAND: 'GB',
    };

    return countryMap[normalized] || this.titleCase(country);
  }

  /**
   * Title case string
   */
  private titleCase(str: string): string {
    return str
      .split(' ')
      .map((word) => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Deduplicate records (remove exact duplicates)
   */
  async deduplicate(records: UnifiedRecord[]): Promise<UnifiedRecord[]> {
    const seen = new Map<string, UnifiedRecord>();

    for (const record of records) {
      const key = this.getDedupeKey(record);
      const existing = seen.get(key);

      if (!existing) {
        seen.set(key, record);
      } else {
        // Merge with existing (prefer higher confidence)
        if (record.confidence > existing.confidence) {
          seen.set(key, this.mergeRecords(existing, record));
        } else {
          seen.set(key, this.mergeRecords(record, existing));
        }
      }
    }

    this.logger.log(
      `Deduplicated ${records.length} → ${seen.size} records`,
    );

    return Array.from(seen.values());
  }

  /**
   * Get deduplication key for record
   */
  private getDedupeKey(record: UnifiedRecord): string {
    // For people: email or full name + company
    if (record.type === 'person') {
      if (record.email) {
        return `email:${record.email}`;
      }
      if (record.fullName && record.companyName) {
        return `person:${record.fullName}:${record.companyName}`;
      }
      if (record.linkedin) {
        return `linkedin:${record.linkedin}`;
      }
    }

    // For companies: domain or name
    if (record.type === 'company') {
      if (record.companyDomain) {
        return `domain:${record.companyDomain}`;
      }
      if (record.companyName) {
        return `company:${record.companyName}`;
      }
    }

    // Fallback to source ID
    return `${record.source}:${record.sourceId}`;
  }

  /**
   * Merge two records (prefer fields from primary)
   */
  private mergeRecords(
    primary: UnifiedRecord,
    secondary: UnifiedRecord,
  ): UnifiedRecord {
    return {
      ...secondary,
      ...primary,
      // Merge non-null fields
      email: primary.email || secondary.email,
      phone: primary.phone || secondary.phone,
      linkedin: primary.linkedin || secondary.linkedin,
      twitter: primary.twitter || secondary.twitter,
      website: primary.website || secondary.website,
      confidence: Math.max(primary.confidence, secondary.confidence),
    };
  }
}
