import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Initialize AI Models
  console.log('📦 Initializing AI models...');

  const aiModels = [
    {
      slug: 'claude-3-haiku',
      name: 'Claude 3 Haiku',
      provider: 'AWS_BEDROCK',
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      tier: 'NANO',
      description: 'Fastest, most cost-effective Claude model',
      costInput: 0.25,
      costOutput: 1.25,
      qualityScore: 0.75,
      speedScore: 0.95,
      contextWindow: 200000,
      maxOutput: 4096,
      priority: 90,
      enabled: true,
    },
    {
      slug: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'OPENAI',
      modelId: 'gpt-3.5-turbo',
      tier: 'SMALL',
      description: 'Fast and cost-effective GPT model',
      costInput: 0.5,
      costOutput: 1.5,
      qualityScore: 0.78,
      speedScore: 0.90,
      contextWindow: 16385,
      maxOutput: 4096,
      priority: 85,
      enabled: true,
    },
    {
      slug: 'claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'AWS_BEDROCK',
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      tier: 'MEDIUM',
      description: 'Balanced performance and cost',
      costInput: 3.0,
      costOutput: 15.0,
      qualityScore: 0.90,
      speedScore: 0.80,
      contextWindow: 200000,
      maxOutput: 8192,
      priority: 80,
      enabled: true,
    },
    {
      slug: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'OPENAI',
      modelId: 'gpt-4-turbo-preview',
      tier: 'LARGE',
      description: 'High quality GPT-4 model',
      costInput: 10.0,
      costOutput: 30.0,
      qualityScore: 0.92,
      speedScore: 0.70,
      contextWindow: 128000,
      maxOutput: 4096,
      priority: 70,
      enabled: true,
    },
    {
      slug: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'AWS_BEDROCK',
      modelId: 'anthropic.claude-3-opus-20240229-v1:0',
      tier: 'PREMIUM',
      description: 'Highest quality Claude model',
      costInput: 15.0,
      costOutput: 75.0,
      qualityScore: 0.98,
      speedScore: 0.60,
      contextWindow: 200000,
      maxOutput: 4096,
      priority: 60,
      enabled: true,
    },
  ];

  for (const model of aiModels) {
    await prisma.aIModel.upsert({
      where: { slug: model.slug },
      update: model,
      create: model,
    });
  }

  console.log(`✅ Created ${aiModels.length} AI models`);

  // 2. Initialize Task Templates
  console.log('📋 Initializing task templates...');

  const taskTemplates = [
    {
      name: 'generate_message',
      category: 'campaigns',
      description: 'Generate personalized campaign message',
      complexity: 'MODERATE',
      qualityMin: 0.8,
      maxLatencyMs: 5000,
    },
    {
      name: 'analyze_sentiment',
      category: 'analytics',
      description: 'Analyze sentiment of text',
      complexity: 'SIMPLE',
      qualityMin: 0.7,
      maxLatencyMs: 3000,
    },
    {
      name: 'enrich_lead',
      category: 'leads',
      description: 'Enrich lead data from sources',
      complexity: 'MODERATE',
      qualityMin: 0.75,
    },
    {
      name: 'plan_data_query',
      category: 'data_orchestration',
      description: 'Plan multi-source data collection',
      complexity: 'COMPLEX',
      qualityMin: 0.85,
    },
    {
      name: 'extract_structured_data',
      category: 'data',
      description: 'Extract structured data from text',
      complexity: 'SIMPLE',
      qualityMin: 0.75,
    },
  ];

  for (const template of taskTemplates) {
    await prisma.taskTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
  }

  console.log(`✅ Created ${taskTemplates.length} task templates`);

  // 3. Initialize Data Sources
  console.log('🔌 Initializing data sources...');

  const dataSources = [
    {
      slug: 'linkedin',
      name: 'LinkedIn',
      type: 'SOCIAL_PLATFORM',
      description: 'Professional network for finding people and companies',
      capabilities: ['discover', 'collect', 'enrich'],
      costPerQuery: 0,
      quality: 0.9,
      rateLimitRequests: 100,
      rateLimitWindowMs: 3600000,
      enabled: true,
      config: {
        baseUrl: 'https://www.linkedin.com',
        useScraping: true,
      },
    },
    {
      slug: 'linkout',
      name: 'Linkout Email Finder',
      type: 'EMAIL_FINDER',
      description: '100% FREE email finding with 85% success rate',
      capabilities: ['enrich'],
      costPerQuery: 0,
      quality: 0.85,
      rateLimitRequests: 1000,
      rateLimitWindowMs: 3600000,
      enabled: true,
      config: {
        methods: ['pattern_matching', 'clearbit', 'website_scraping', 'github', 'emailrep'],
      },
    },
    {
      slug: 'google_maps',
      name: 'Google Maps',
      type: 'MAP_SERVICE',
      description: 'Find businesses and locations',
      capabilities: ['discover', 'collect'],
      costPerQuery: 0.017,
      quality: 0.95,
      rateLimitRequests: 100,
      rateLimitWindowMs: 1000,
      enabled: false,
      config: {
        requiresApiKey: true,
      },
    },
    {
      slug: 'web_scraper',
      name: 'Web Scraper',
      type: 'WEB_SCRAPER',
      description: 'Generic web scraping for any website',
      capabilities: ['extract', 'collect'],
      costPerQuery: 0,
      quality: 0.7,
      rateLimitRequests: 50,
      rateLimitWindowMs: 60000,
      enabled: true,
      config: {
        userAgent: 'Mozilla/5.0 (compatible; USAMKObot/1.0)',
      },
    },
    {
      slug: 'github',
      name: 'GitHub',
      type: 'DEVELOPER_PLATFORM',
      description: 'Find developers and projects',
      capabilities: ['discover', 'collect', 'enrich'],
      costPerQuery: 0,
      quality: 0.8,
      rateLimitRequests: 60,
      rateLimitWindowMs: 3600000,
      enabled: true,
      config: {
        baseUrl: 'https://api.github.com',
      },
    },
  ];

  for (const source of dataSources) {
    await prisma.dataSource.upsert({
      where: { slug: source.slug },
      update: source,
      create: source,
    });
  }

  console.log(`✅ Created ${dataSources.length} data sources`);

  // 4. Initialize Default Permissions
  console.log('🔐 Initializing permissions...');

  const permissions = [
    // User permissions
    { code: 'user.read', name: 'View users', category: 'users', description: 'View user list and details' },
    { code: 'user.create', name: 'Create users', category: 'users', description: 'Create new users' },
    { code: 'user.update', name: 'Update users', category: 'users', description: 'Edit user information' },
    { code: 'user.delete', name: 'Delete users', category: 'users', description: 'Delete user accounts' },
    { code: 'user.suspend', name: 'Suspend users', category: 'users', description: 'Suspend user accounts' },

    // Role permissions
    { code: 'role.read', name: 'View roles', category: 'roles', description: 'View role list and details' },
    { code: 'role.create', name: 'Create roles', category: 'roles', description: 'Create new roles' },
    { code: 'role.update', name: 'Update roles', category: 'roles', description: 'Edit role configuration' },
    { code: 'role.delete', name: 'Delete roles', category: 'roles', description: 'Delete roles' },

    // Campaign permissions
    { code: 'campaign.read', name: 'View campaigns', category: 'campaigns', description: 'View campaign list' },
    { code: 'campaign.create', name: 'Create campaigns', category: 'campaigns', description: 'Create new campaigns' },
    { code: 'campaign.update', name: 'Update campaigns', category: 'campaigns', description: 'Edit campaigns' },
    { code: 'campaign.delete', name: 'Delete campaigns', category: 'campaigns', description: 'Delete campaigns' },
    { code: 'campaign.execute', name: 'Execute campaigns', category: 'campaigns', description: 'Run campaigns' },

    // Lead permissions
    { code: 'lead.read', name: 'View leads', category: 'leads', description: 'View lead list and details' },
    { code: 'lead.create', name: 'Create leads', category: 'leads', description: 'Create new leads' },
    { code: 'lead.update', name: 'Update leads', category: 'leads', description: 'Edit lead information' },
    { code: 'lead.delete', name: 'Delete leads', category: 'leads', description: 'Delete leads' },
    { code: 'lead.export', name: 'Export leads', category: 'leads', description: 'Export lead data' },

    // AI permissions
    { code: 'ai.execute', name: 'Execute AI tasks', category: 'ai', description: 'Use AI features' },
    { code: 'ai.manage', name: 'Manage AI', category: 'ai', description: 'Configure AI models and budgets' },

    // Data permissions
    { code: 'data.query', name: 'Query data', category: 'data', description: 'Execute data queries' },
    { code: 'data.export', name: 'Export data', category: 'data', description: 'Export query results' },

    // Admin permissions
    { code: 'admin.access', name: 'Admin access', category: 'admin', description: 'Access admin panel' },
    { code: 'audit.read', name: 'View audit logs', category: 'admin', description: 'View system audit logs' },
    { code: 'settings.update', name: 'Update settings', category: 'admin', description: 'Modify system settings' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: perm,
      create: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // 5. Initialize Default Roles
  console.log('👤 Initializing default roles...');

  const roles = [
    {
      name: 'Super Admin',
      slug: 'super_admin',
      description: 'Full system access',
      isSystem: true,
      permissions: permissions.map(p => p.code),
    },
    {
      name: 'Admin',
      slug: 'admin',
      description: 'Administrative access',
      isSystem: true,
      permissions: permissions.filter(p => !p.code.startsWith('settings.')).map(p => p.code),
    },
    {
      name: 'Manager',
      slug: 'manager',
      description: 'Team management access',
      isSystem: true,
      permissions: permissions.filter(p =>
        ['user.read', 'campaign.*', 'lead.*', 'ai.execute', 'data.query'].some(pattern => {
          if (pattern.endsWith('.*')) {
            return p.code.startsWith(pattern.replace('.*', '.'));
          }
          return p.code === pattern;
        })
      ).map(p => p.code),
    },
    {
      name: 'User',
      slug: 'user',
      description: 'Standard user access',
      isSystem: true,
      permissions: permissions.filter(p =>
        ['campaign.read', 'campaign.create', 'lead.read', 'lead.create', 'ai.execute', 'data.query'].includes(p.code)
      ).map(p => p.code),
    },
    {
      name: 'Viewer',
      slug: 'viewer',
      description: 'Read-only access',
      isSystem: true,
      permissions: permissions.filter(p => p.code.endsWith('.read')).map(p => p.code),
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: role,
      create: role,
    });
  }

  console.log(`✅ Created ${roles.length} default roles`);

  console.log('✨ Seeding completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
