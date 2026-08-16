import { Injectable, Logger } from '@nestjs/common';
import { DataOrchestrator } from './orchestrator.service';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

interface AICollectionRequest {
  query: string;
  tenantId: string;
  userId?: string;
  additionalContext?: Record<string, any>;
}

interface AICollectionResponse {
  query: string;
  understanding: string;
  sources: string[];
  totalResults: number;
  results: any[];
  executionTime: number;
  summary: string;
}

@Injectable()
export class AICollectionOrchestratorService {
  private readonly logger = new Logger(AICollectionOrchestratorService.name);
  private bedrockClient: BedrockRuntimeClient;
  private readonly useDemoMode: boolean;

  constructor(
    private readonly dataOrchestrator: DataOrchestrator,
  ) {
    // Initialize AWS Bedrock client
    const region = process.env.AWS_REGION || 'us-east-1';
    this.useDemoMode = !process.env.AWS_ACCESS_KEY_ID;

    if (this.useDemoMode) {
      this.logger.warn('Running in demo mode - AWS credentials not configured');
    } else {
      this.bedrockClient = new BedrockRuntimeClient({ region });
    }
  }

  /**
   * Parse natural language query into structured data collection request
   */
  async parseQuery(query: string): Promise<any> {
    if (this.useDemoMode) {
      return this.parseDemoQuery(query);
    }

    try {
      const prompt = `Parse this data collection query into a structured format:

Query: "${query}"

Extract and return JSON with:
{
  "intent": "search|profile|company|list",
  "platform": "linkedin|facebook|instagram|twitter|telegram|youtube|web",
  "searchQuery": "extracted search terms",
  "filters": {
    "location": "if specified",
    "industry": "if specified",
    "company": "if specified",
    "title": "if specified"
  },
  "limit": 10
}

Only return the JSON, no explanation.`;

      const response = await this.bedrockClient.send(
        new InvokeModelCommand({
          modelId: 'us.anthropic.claude-3-5-sonnet-20250114-v1:0',
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 500,
            temperature: 0,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        }),
      );

      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body),
      );
      const text = responseBody.content[0].text;

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      throw new Error('Failed to parse AI response');
    } catch (error) {
      this.logger.error('AI query parsing failed:', error);
      return this.parseDemoQuery(query);
    }
  }

  /**
   * Demo mode query parser using simple heuristics
   */
  private parseDemoQuery(query: string): any {
    const lowerQuery = query.toLowerCase();

    let intent = 'search';
    let platform = 'linkedin';
    let filters: any = {};

    // Detect intent
    if (lowerQuery.includes('profile') || lowerQuery.includes('person')) {
      intent = 'profile';
    } else if (lowerQuery.includes('company') || lowerQuery.includes('organization')) {
      intent = 'company';
    }

    // Detect platform
    if (lowerQuery.includes('facebook')) platform = 'facebook';
    else if (lowerQuery.includes('instagram')) platform = 'instagram';
    else if (lowerQuery.includes('twitter')) platform = 'twitter';
    else if (lowerQuery.includes('telegram')) platform = 'telegram';
    else if (lowerQuery.includes('youtube')) platform = 'youtube';

    // Extract location
    const locationMatch = query.match(/in ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (locationMatch) filters.location = locationMatch[1];

    // Extract industry
    const industries = ['tech', 'finance', 'healthcare', 'education', 'retail', 'marketing'];
    const foundIndustry = industries.find(ind => lowerQuery.includes(ind));
    if (foundIndustry) filters.industry = foundIndustry;

    // Extract company
    const companyMatch = query.match(/at ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (companyMatch) filters.company = companyMatch[1];

    // Extract title
    const titles = ['CEO', 'CTO', 'CFO', 'manager', 'director', 'engineer', 'developer', 'designer'];
    const foundTitle = titles.find(title => lowerQuery.includes(title));
    if (foundTitle) filters.title = foundTitle;

    return {
      intent,
      platform,
      searchQuery: query,
      filters,
      limit: 10,
    };
  }

  /**
   * Generate summary of collection results using AI
   */
  async summarizeResults(query: string, results: any[]): Promise<string> {
    if (this.useDemoMode || results.length === 0) {
      return this.generateDemoSummary(query, results);
    }

    try {
      const prompt = `Summarize these data collection results for the query: "${query}"

Results: ${JSON.stringify(results.slice(0, 5), null, 2)}
Total results: ${results.length}

Provide a brief 2-3 sentence summary highlighting key findings and data quality.`;

      const response = await this.bedrockClient.send(
        new InvokeModelCommand({
          modelId: 'us.anthropic.claude-3-5-sonnet-20250114-v1:0',
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 200,
            temperature: 0.7,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        }),
      );

      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body),
      );
      return responseBody.content[0].text;
    } catch (error) {
      this.logger.error('AI summary generation failed:', error);
      return this.generateDemoSummary(query, results);
    }
  }

  /**
   * Demo mode summary generator
   */
  private generateDemoSummary(query: string, results: any[]): string {
    if (results.length === 0) {
      return `No results found for query: "${query}". Try adjusting your search terms or filters.`;
    }

    const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
    const sources = [...new Set(results.flatMap(r => r.sources || []))];

    return `Found ${results.length} results for "${query}" from ${sources.length} sources. Average data quality score: ${avgScore.toFixed(0)}/100. Results include verified profiles with contact information and professional details.`;
  }

  /**
   * Main method: collect data using natural language query
   */
  async collectWithAI(request: AICollectionRequest): Promise<AICollectionResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Parse natural language query into structured request
      this.logger.log(`Parsing query: ${request.query}`);
      const parsed = await this.parseQuery(request.query);

      // Step 2: Build DataCollectionRequest
      const collectionRequest = {
        tenantId: request.tenantId,
        userId: request.userId,
        query: parsed.searchQuery,
        entityType: 'person' as const, // Required field
        maxResults: parsed.limit || 10,
        location: parsed.filters.location,
        filters: {
          ...parsed.filters,
          platform: parsed.platform, // Store in filters instead
          intent: parsed.intent,
        },
        autoScore: true,
        deduplication: true,
      };

      // Step 3: Execute collection
      this.logger.log('Executing data collection', collectionRequest);
      const collectionResult = await this.dataOrchestrator.collect(collectionRequest);

      // Step 4: Generate AI summary
      const summary = await this.summarizeResults(request.query, collectionResult.items);

      const executionTime = Date.now() - startTime;

      return {
        query: request.query,
        understanding: `Intent: ${parsed.intent}, Platform: ${parsed.platform}${Object.keys(parsed.filters).length > 0 ? ', Filters: ' + JSON.stringify(parsed.filters) : ''}`,
        sources: collectionResult.sourceResults.map(sr => sr.sourceId),
        totalResults: collectionResult.items.length,
        results: collectionResult.items,
        executionTime,
        summary,
      };
    } catch (error) {
      this.logger.error('AI collection failed:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; mode: string }> {
    return {
      status: 'ok',
      mode: this.useDemoMode ? 'demo' : 'production',
    };
  }
}
