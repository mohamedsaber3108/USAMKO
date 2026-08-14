import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as csvParser from 'csv-parser';

/**
 * Dataset Service - 100% FREE
 *
 * Data Sources (ALL FREE & OPEN):
 * 1. Kaggle datasets (millions of free datasets)
 * 2. Data.gov (US government open data)
 * 3. Google Dataset Search
 * 4. UCI Machine Learning Repository
 * 5. GitHub open datasets
 * 6. Awesome Public Datasets
 * 7. OpenML datasets
 * 8. Papers With Code datasets
 */
@Injectable()
export class DatasetService {
  private readonly logger = new Logger(DatasetService.name);
  private readonly kaggleUsername = process.env.KAGGLE_USERNAME;
  private readonly kaggleKey = process.env.KAGGLE_KEY;
  private readonly datasetsDir = path.join(process.cwd(), 'datasets');

  constructor() {
    // Create datasets directory
    if (!fs.existsSync(this.datasetsDir)) {
      fs.mkdirSync(this.datasetsDir, { recursive: true });
    }
  }

  /**
   * Search for datasets across multiple sources (100% FREE)
   */
  async searchDatasets(params: {
    query: string;
    category?: string;
    format?: string;
    limit?: number;
  }): Promise<Array<{
    title: string;
    description: string;
    url: string;
    source: string;
    size: string;
    format: string;
    downloads: number;
    tags: string[];
  }>> {
    const allDatasets: any[] = [];

    // Source 1: Kaggle datasets
    const kaggleDatasets = await this.searchKaggle(params);
    allDatasets.push(...kaggleDatasets);

    // Source 2: Data.gov
    const dataGovDatasets = await this.searchDataGov(params);
    allDatasets.push(...dataGovDatasets);

    // Source 3: GitHub datasets
    const githubDatasets = await this.searchGitHubDatasets(params);
    allDatasets.push(...githubDatasets);

    // Source 4: UCI ML Repository
    const uciDatasets = await this.searchUCI(params);
    allDatasets.push(...uciDatasets);

    return allDatasets.slice(0, params.limit || 50);
  }

  /**
   * Source 1: Kaggle datasets (100% FREE, millions available)
   */
  private async searchKaggle(params: any): Promise<any[]> {
    const datasets: any[] = [];

    try {
      // Kaggle API (requires free API key)
      if (this.kaggleUsername && this.kaggleKey) {
        const auth = Buffer.from(`${this.kaggleUsername}:${this.kaggleKey}`).toString('base64');

        const response = await axios.get('https://www.kaggle.com/api/v1/datasets/list', {
          headers: { Authorization: `Basic ${auth}` },
          params: {
            search: params.query,
            page: 1,
            maxSize: 1000,
          },
        });

        response.data.forEach((dataset: any) => {
          datasets.push({
            title: dataset.title,
            description: dataset.subtitle,
            url: `https://www.kaggle.com/${dataset.ref}`,
            source: 'kaggle',
            size: dataset.totalBytes,
            format: 'CSV/JSON',
            downloads: dataset.downloadCount,
            tags: dataset.tags || [],
          });
        });
      }
    } catch (error) {
      this.logger.warn('Kaggle search failed:', error.message);
    }

    return datasets;
  }

  /**
   * Source 2: Data.gov (100% FREE US government data)
   */
  private async searchDataGov(params: any): Promise<any[]> {
    const datasets: any[] = [];

    try {
      const response = await axios.get('https://catalog.data.gov/api/3/action/package_search', {
        params: {
          q: params.query,
          rows: 20,
        },
      });

      response.data.result.results.forEach((dataset: any) => {
        datasets.push({
          title: dataset.title,
          description: dataset.notes,
          url: `https://catalog.data.gov/dataset/${dataset.name}`,
          source: 'data.gov',
          size: 'Unknown',
          format: dataset.resources?.[0]?.format || 'Multiple',
          downloads: 0,
          tags: dataset.tags?.map((t: any) => t.name) || [],
        });
      });
    } catch (error) {
      this.logger.warn('Data.gov search failed:', error.message);
    }

    return datasets;
  }

  /**
   * Source 3: GitHub datasets (100% FREE)
   */
  private async searchGitHubDatasets(params: any): Promise<any[]> {
    const datasets: any[] = [];

    try {
      const response = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: `${params.query} dataset`,
          sort: 'stars',
          per_page: 20,
        },
      });

      response.data.items.forEach((repo: any) => {
        datasets.push({
          title: repo.name,
          description: repo.description,
          url: repo.html_url,
          source: 'github',
          size: `${repo.size} KB`,
          format: 'Multiple',
          downloads: repo.stargazers_count,
          tags: repo.topics || [],
        });
      });
    } catch (error) {
      this.logger.warn('GitHub datasets search failed:', error.message);
    }

    return datasets;
  }

  /**
   * Source 4: UCI Machine Learning Repository (100% FREE)
   */
  private async searchUCI(params: any): Promise<any[]> {
    const datasets: any[] = [];

    try {
      // UCI datasets are listed on their website
      // We can scrape the index page
      const response = await axios.get('https://archive.ics.uci.edu/ml/datasets.php');

      // Parse HTML and extract dataset links
      // This is a simplified version - full implementation would parse HTML
      const uciDatasets = [
        {
          title: 'Iris Dataset',
          description: 'Classic dataset for classification',
          url: 'https://archive.ics.uci.edu/ml/datasets/iris',
          source: 'uci',
          size: '5 KB',
          format: 'CSV',
          downloads: 100000,
          tags: ['classification', 'multivariate'],
        },
        // Add more UCI datasets here
      ];

      datasets.push(...uciDatasets);
    } catch (error) {
      this.logger.warn('UCI search failed:', error.message);
    }

    return datasets;
  }

  /**
   * Download dataset from Kaggle (100% FREE)
   */
  async downloadKaggleDataset(datasetRef: string): Promise<string> {
    try {
      if (!this.kaggleUsername || !this.kaggleKey) {
        throw new Error('Kaggle credentials not configured');
      }

      const auth = Buffer.from(`${this.kaggleUsername}:${this.kaggleKey}`).toString('base64');
      const downloadPath = path.join(this.datasetsDir, `${datasetRef.replace('/', '_')}.zip`);

      const response = await axios.get(
        `https://www.kaggle.com/api/v1/datasets/download/${datasetRef}`,
        {
          headers: { Authorization: `Basic ${auth}` },
          responseType: 'stream',
        },
      );

      const writer = fs.createWriteStream(downloadPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(downloadPath));
        writer.on('error', reject);
      });
    } catch (error) {
      this.logger.error(`Failed to download Kaggle dataset ${datasetRef}:`, error.message);
      throw error;
    }
  }

  /**
   * Parse CSV dataset (100% FREE)
   */
  async parseCSV(filePath: string, limit = 1000): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const results: any[] = [];

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (data) => {
          if (results.length < limit) {
            results.push(data);
          }
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * Get recommended B2B datasets (100% FREE)
   */
  async getB2BDatasets(): Promise<any[]> {
    return [
      {
        title: 'Fortune 1000 Companies',
        description: 'List of Fortune 1000 companies with details',
        url: 'https://www.kaggle.com/winston56/fortune-500-data-2021',
        source: 'kaggle',
        category: 'B2B',
      },
      {
        title: 'LinkedIn Job Postings',
        description: 'LinkedIn job postings dataset',
        url: 'https://www.kaggle.com/arshkon/linkedin-job-postings',
        source: 'kaggle',
        category: 'B2B',
      },
      {
        title: 'Crunchbase Companies',
        description: 'Crunchbase companies and funding data',
        url: 'https://www.kaggle.com/arindam235/startup-investments-crunchbase',
        source: 'kaggle',
        category: 'B2B',
      },
      {
        title: 'GitHub Users',
        description: 'GitHub users and repositories',
        url: 'https://www.kaggle.com/github/github-repos',
        source: 'kaggle',
        category: 'Developers',
      },
      {
        title: 'US Company Addresses',
        description: 'US company addresses and contact info',
        url: 'https://catalog.data.gov/dataset/business-licenses',
        source: 'data.gov',
        category: 'B2B',
      },
    ];
  }

  /**
   * Enrich leads with dataset data (100% FREE)
   */
  async enrichWithDatasets(leads: Array<{
    company: string;
    industry?: string;
  }>): Promise<any[]> {
    // Load relevant datasets
    const datasets = await this.getB2BDatasets();

    // For each lead, try to find matching data
    const enrichedLeads = [];

    for (const lead of leads) {
      const enrichedData = {
        ...lead,
        enrichedFrom: [],
      };

      // Check if company exists in datasets
      // This is a simplified version - full implementation would load and search datasets

      enrichedLeads.push(enrichedData);
    }

    return enrichedLeads;
  }

  /**
   * Get popular free datasets by category
   */
  async getPopularDatasets(): Promise<Record<string, any[]>> {
    return {
      'B2B Companies': await this.getB2BDatasets(),
      'Email Lists': [
        {
          title: 'Email Marketing Dataset',
          url: 'https://www.kaggle.com/loveall/email-campaign-management',
          source: 'kaggle',
        },
      ],
      'Social Media': [
        {
          title: 'Twitter Users',
          url: 'https://www.kaggle.com/hwassner/TwitterFriends',
          source: 'kaggle',
        },
      ],
      'Developers': [
        {
          title: 'GitHub Users',
          url: 'https://www.kaggle.com/github/github-repos',
          source: 'kaggle',
        },
      ],
    };
  }
}
