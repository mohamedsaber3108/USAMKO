import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface EmailLookupResult {
  email: string | null;
  confidence: number;
  firstName?: string;
  lastName?: string;
  domain?: string;
  sources: Array<{
    domain: string;
    uri: string;
    extracted_on: string;
    last_seen_on: string;
    still_on_page: boolean;
  }>;
}

@Injectable()
export class LinkoutWorkerService {
  private readonly logger = new Logger(LinkoutWorkerService.name);
  private readonly hunterApiKey = process.env.HUNTER_API_KEY;

  async findEmail(params: {
    firstName?: string;
    lastName?: string;
    domain?: string;
    fullName?: string;
    linkedinUrl?: string;
  }): Promise<EmailLookupResult> {
    try {
      if (!this.hunterApiKey) {
        throw new Error('HUNTER_API_KEY environment variable is not set');
      }

      this.logger.log(`Finding email for: ${params.fullName || `${params.firstName} ${params.lastName}`}`);

      let domain = params.domain;

      // Extract domain from LinkedIn URL if provided
      if (!domain && params.linkedinUrl) {
        domain = await this.extractDomainFromLinkedIn(params.linkedinUrl);
      }

      if (!domain) {
        throw new Error('Domain is required for email lookup');
      }

      // Call Hunter.io Email Finder API
      const response = await axios.get('https://api.hunter.io/v2/email-finder', {
        params: {
          domain,
          first_name: params.firstName,
          last_name: params.lastName,
          full_name: params.fullName,
          api_key: this.hunterApiKey,
        },
        timeout: 10000,
      });

      if (response.data.data.email) {
        this.logger.log(`Found email: ${response.data.data.email} (confidence: ${response.data.data.score}%)`);

        return {
          email: response.data.data.email,
          confidence: response.data.data.score,
          firstName: response.data.data.first_name,
          lastName: response.data.data.last_name,
          domain: response.data.data.domain,
          sources: response.data.data.sources || [],
        };
      } else {
        this.logger.warn(`No email found for ${params.fullName || `${params.firstName} ${params.lastName}`}`);
        return {
          email: null,
          confidence: 0,
          sources: [],
        };
      }
    } catch (error) {
      this.logger.error(`Failed to find email: ${error.message}`, error.stack);
      return {
        email: null,
        confidence: 0,
        sources: [],
      };
    }
  }

  async verifyEmail(email: string): Promise<{
    valid: boolean;
    score: number;
    result: string;
  }> {
    try {
      if (!this.hunterApiKey) {
        throw new Error('HUNTER_API_KEY environment variable is not set');
      }

      this.logger.log(`Verifying email: ${email}`);

      const response = await axios.get('https://api.hunter.io/v2/email-verifier', {
        params: {
          email,
          api_key: this.hunterApiKey,
        },
        timeout: 10000,
      });

      return {
        valid: response.data.data.result === 'deliverable',
        score: response.data.data.score,
        result: response.data.data.result,
      };
    } catch (error) {
      this.logger.error(`Failed to verify email: ${error.message}`, error.stack);
      return {
        valid: false,
        score: 0,
        result: 'unknown',
      };
    }
  }

  private async extractDomainFromLinkedIn(linkedinUrl: string): Promise<string | null> {
    try {
      // This is a simplified version - in production, you'd scrape the LinkedIn company page
      // For now, we'll just return null and require the domain to be provided
      this.logger.warn('Domain extraction from LinkedIn not yet implemented');
      return null;
    } catch (error) {
      this.logger.error(`Failed to extract domain from LinkedIn: ${error.message}`);
      return null;
    }
  }
}
