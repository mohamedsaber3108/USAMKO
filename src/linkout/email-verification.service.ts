import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface EmailVerificationResult {
  valid: boolean;
  exists: boolean;
  reputation: 'high' | 'medium' | 'low' | 'unknown';
  score: number;
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Verify email using EmailRep.io (100% FREE, UNLIMITED)
   */
  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`https://emailrep.io/${email}`, {
          timeout: 5000,
        }),
      );

      if (response.data) {
        return {
          valid: true,
          exists: response.data.details?.exists || false,
          reputation: response.data.reputation || 'unknown',
          score:
            response.data.reputation === 'high'
              ? 90
              : response.data.reputation === 'medium'
              ? 60
              : 30,
        };
      }
    } catch (error) {
      this.logger.warn(`Email verification failed for ${email}:`, error.message);
    }

    // Fallback to basic validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return {
      valid: emailRegex.test(email),
      exists: false,
      reputation: 'unknown',
      score: 50,
    };
  }

  /**
   * Bulk verify emails
   */
  async verifyBulk(
    emails: string[],
  ): Promise<Map<string, EmailVerificationResult>> {
    const results = new Map<string, EmailVerificationResult>();

    for (const email of emails) {
      const result = await this.verifyEmail(email);
      results.set(email, result);

      // Polite delay
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Basic email format validation (no API call)
   */
  isValidFormat(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }
}
