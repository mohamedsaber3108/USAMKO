import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as XLSX from 'xlsx';

const execAsync = promisify(exec);

export interface LinkedInCompany {
  name: string;
  url: string;
  location?: string;
  industry?: string;
  size?: string;
  description?: string;
}

export interface LinkedInPerson {
  name: string;
  title?: string;
  linkedinUrl: string;
  location?: string;
  company?: string;
}

@Injectable()
export class LinkedInWorkerService {
  private readonly logger = new Logger(LinkedInWorkerService.name);
  private readonly linkedInScriptPath = 'C:\\Users\\moham\\Desktop\\linkedin-lead-collector-fixed (1)';

  async discoverCompanies(params: {
    industry: string;
    location: string;
    maxCompanies: number;
  }): Promise<LinkedInCompany[]> {
    try {
      this.logger.log(`Discovering companies: ${params.industry} in ${params.location}`);

      const outputFile = path.join(this.linkedInScriptPath, `companies_${Date.now()}.xlsx`);
      const command = `cd "${this.linkedInScriptPath}" && python discover_companies.py --industry "${params.industry}" --location "${params.location}" --max-results ${params.maxCompanies} --output "${outputFile}"`;

      this.logger.debug(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      if (stderr) {
        this.logger.warn(`LinkedIn scraper stderr: ${stderr}`);
      }

      this.logger.log(`LinkedIn scraper output: ${stdout}`);

      // Read Excel file
      const fileBuffer = await fs.readFile(outputFile);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<LinkedInCompany>(worksheet);

      // Clean up output file
      await fs.unlink(outputFile).catch(() => {});

      this.logger.log(`Discovered ${data.length} companies`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to discover companies: ${error.message}`, error.stack);
      throw new Error(`LinkedIn company discovery failed: ${error.message}`);
    }
  }

  async searchPeopleAtCompany(params: {
    companyUrl: string;
    role?: string;
    maxResults: number;
  }): Promise<LinkedInPerson[]> {
    try {
      this.logger.log(`Searching people at company: ${params.companyUrl}`);

      const outputFile = path.join(this.linkedInScriptPath, `people_${Date.now()}.xlsx`);
      const roleArg = params.role ? `--role "${params.role}"` : '';
      const command = `cd "${this.linkedInScriptPath}" && python search_role_at_company.py --company-url "${params.companyUrl}" ${roleArg} --max-results ${params.maxResults} --output "${outputFile}"`;

      this.logger.debug(`Executing: ${command}`);
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 minutes
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      if (stderr) {
        this.logger.warn(`LinkedIn scraper stderr: ${stderr}`);
      }

      this.logger.log(`LinkedIn scraper output: ${stdout}`);

      // Read Excel file
      const fileBuffer = await fs.readFile(outputFile);
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<LinkedInPerson>(worksheet);

      // Clean up output file
      await fs.unlink(outputFile).catch(() => {});

      this.logger.log(`Found ${data.length} people`);
      return data;
    } catch (error) {
      this.logger.error(`Failed to search people: ${error.message}`, error.stack);
      throw new Error(`LinkedIn people search failed: ${error.message}`);
    }
  }
}
