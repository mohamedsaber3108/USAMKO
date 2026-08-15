import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 0. Create default tenant
  console.log('🏢 Creating default tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default',
      status: 'active',
    },
  });
  console.log(`✅ Default tenant ready: ${tenant.id}`);

  // 1. Initialize AI Models
  console.log('📦 Initializing AI models...');

  const aiModels = [
    {
      provider: 'AWS_BEDROCK' as const,
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      name: 'Claude 3 Haiku',
      version: 'v1',
      maxTokens: 200000,
      supportsVision: false,
      supportsTools: true,
      costInput: 0.25,
      costOutput: 1.25,
      tier: 'NANO' as const,
      qualityScore: 0.75,
      speedScore: 0.95,
      priority: 90,
      enabled: true,
    },
    {
      provider: 'OPENAI' as const,
      modelId: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      version: 'turbo',
      maxTokens: 16000,
      supportsVision: false,
      supportsTools: true,
      costInput: 0.5,
      costOutput: 1.5,
      tier: 'SMALL' as const,
      qualityScore: 0.78,
      speedScore: 0.90,
      priority: 85,
      enabled: true,
    },
    {
      provider: 'AWS_BEDROCK' as const,
      modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      name: 'Claude 3.5 Sonnet',
      version: 'v2',
      maxTokens: 200000,
      supportsVision: true,
      supportsTools: true,
      costInput: 3.0,
      costOutput: 15.0,
      tier: 'MEDIUM' as const,
      qualityScore: 0.90,
      speedScore: 0.80,
      priority: 80,
      enabled: true,
    },
    {
      provider: 'OPENAI' as const,
      modelId: 'gpt-4-turbo-preview',
      name: 'GPT-4 Turbo',
      version: 'turbo',
      maxTokens: 128000,
      supportsVision: true,
      supportsTools: true,
      costInput: 10.0,
      costOutput: 30.0,
      tier: 'LARGE' as const,
      qualityScore: 0.92,
      speedScore: 0.70,
      priority: 70,
      enabled: true,
    },
    {
      provider: 'AWS_BEDROCK' as const,
      modelId: 'anthropic.claude-3-opus-20240229-v1:0',
      name: 'Claude 3 Opus',
      version: 'v1',
      maxTokens: 200000,
      supportsVision: true,
      supportsTools: true,
      costInput: 15.0,
      costOutput: 75.0,
      tier: 'PREMIUM' as const,
      qualityScore: 0.98,
      speedScore: 0.60,
      priority: 60,
      enabled: true,
    },
  ];

  for (const model of aiModels) {
    await prisma.aIModel.upsert({
      where: {
        provider_modelId: {
          provider: model.provider,
          modelId: model.modelId,
        },
      },
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
      complexity: 'MODERATE' as const,
      qualityMin: 0.8,
      maxLatencyMs: 5000,
      recommendedModels: ['anthropic.claude-3-5-sonnet-20241022-v2:0'],
    },
    {
      name: 'analyze_sentiment',
      category: 'analytics',
      description: 'Analyze sentiment of text',
      complexity: 'SIMPLE' as const,
      qualityMin: 0.7,
      maxLatencyMs: 3000,
      recommendedModels: ['anthropic.claude-3-haiku-20240307-v1:0'],
    },
    {
      name: 'enrich_lead',
      category: 'leads',
      description: 'Enrich lead data from sources',
      complexity: 'MODERATE' as const,
      qualityMin: 0.75,
      recommendedModels: ['gpt-3.5-turbo'],
    },
    {
      name: 'plan_data_query',
      category: 'data_orchestration',
      description: 'Plan multi-source data collection',
      complexity: 'COMPLEX' as const,
      qualityMin: 0.85,
      recommendedModels: ['anthropic.claude-3-5-sonnet-20241022-v2:0'],
    },
    {
      name: 'extract_structured_data',
      category: 'data',
      description: 'Extract structured data from text',
      complexity: 'SIMPLE' as const,
      qualityMin: 0.75,
      recommendedModels: ['anthropic.claude-3-haiku-20240307-v1:0'],
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
      provider: 'linkedin',
      type: 'SOCIAL_PLATFORM' as const,
      capabilities: ['discover', 'collect', 'enrich'],
      costPerQuery: 0,
      quality: 0.9,
      rateLimit: 100,
      enabled: true,
    },
    {
      slug: 'linkout',
      name: 'Linkout Email Finder',
      provider: 'linkout',
      type: 'EMAIL_FINDER' as const,
      capabilities: ['enrich'],
      costPerQuery: 0,
      quality: 0.85,
      rateLimit: 1000,
      enabled: true,
    },
    {
      slug: 'google_maps',
      name: 'Google Maps',
      provider: 'google',
      type: 'MAP_SERVICE' as const,
      capabilities: ['discover', 'collect'],
      costPerQuery: 0.017,
      quality: 0.95,
      rateLimit: 100,
      requiresAuth: true,
      enabled: false,
    },
    {
      slug: 'web_scraper',
      name: 'Web Scraper',
      provider: 'internal',
      type: 'WEB_SCRAPER' as const,
      capabilities: ['extract', 'collect'],
      costPerQuery: 0,
      quality: 0.7,
      rateLimit: 50,
      enabled: true,
    },
    {
      slug: 'github',
      name: 'GitHub',
      provider: 'github',
      type: 'WEB_SCRAPER' as const,
      capabilities: ['discover', 'collect', 'enrich'],
      costPerQuery: 0,
      quality: 0.8,
      rateLimit: 60,
      enabled: true,
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
    { key: 'user.read', name: 'View users', category: 'users', description: 'View user list and details' },
    { key: 'user.create', name: 'Create users', category: 'users', description: 'Create new users' },
    { key: 'user.update', name: 'Update users', category: 'users', description: 'Edit user information' },
    { key: 'user.delete', name: 'Delete users', category: 'users', description: 'Delete user accounts' },
    { key: 'user.suspend', name: 'Suspend users', category: 'users', description: 'Suspend user accounts' },
    { key: 'role.read', name: 'View roles', category: 'roles', description: 'View role list and details' },
    { key: 'role.create', name: 'Create roles', category: 'roles', description: 'Create new roles' },
    { key: 'role.update', name: 'Update roles', category: 'roles', description: 'Edit role configuration' },
    { key: 'role.delete', name: 'Delete roles', category: 'roles', description: 'Delete roles' },
    { key: 'campaign.read', name: 'View campaigns', category: 'campaigns', description: 'View campaign list' },
    { key: 'campaign.create', name: 'Create campaigns', category: 'campaigns', description: 'Create new campaigns' },
    { key: 'campaign.update', name: 'Update campaigns', category: 'campaigns', description: 'Edit campaigns' },
    { key: 'campaign.delete', name: 'Delete campaigns', category: 'campaigns', description: 'Delete campaigns' },
    { key: 'campaign.execute', name: 'Execute campaigns', category: 'campaigns', description: 'Run campaigns' },
    { key: 'lead.read', name: 'View leads', category: 'leads', description: 'View lead list and details' },
    { key: 'lead.create', name: 'Create leads', category: 'leads', description: 'Create new leads' },
    { key: 'lead.update', name: 'Update leads', category: 'leads', description: 'Edit lead information' },
    { key: 'lead.delete', name: 'Delete leads', category: 'leads', description: 'Delete leads' },
    { key: 'lead.export', name: 'Export leads', category: 'leads', description: 'Export lead data' },
    { key: 'ai.execute', name: 'Execute AI tasks', category: 'ai', description: 'Use AI features' },
    { key: 'ai.manage', name: 'Manage AI', category: 'ai', description: 'Configure AI models and budgets' },
    { key: 'data.query', name: 'Query data', category: 'data', description: 'Execute data queries' },
    { key: 'data.export', name: 'Export data', category: 'data', description: 'Export query results' },
    { key: 'admin.access', name: 'Admin access', category: 'admin', description: 'Access admin panel' },
    { key: 'audit.read', name: 'View audit logs', category: 'admin', description: 'View system audit logs' },
    { key: 'settings.update', name: 'Update settings', category: 'admin', description: 'Modify system settings' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: perm,
      create: perm,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // 5. Initialize Default Roles
  console.log('👤 Initializing default roles...');

  const roles = [
    {
      tenantId: tenant.id,
      name: 'Super Admin',
      slug: 'super_admin',
      description: 'Full system access',
      isSystem: true,
      permissions: permissions.map(p => p.key),
      featureAccess: { all: true },
      platformAccess: ['linkedin', 'email', 'web'],
    },
    {
      tenantId: tenant.id,
      name: 'Admin',
      slug: 'admin',
      description: 'Administrative access',
      isSystem: true,
      permissions: permissions.filter(p => !p.key.startsWith('settings.')).map(p => p.key),
      featureAccess: { all: true },
      platformAccess: ['linkedin', 'email', 'web'],
    },
    {
      tenantId: tenant.id,
      name: 'Manager',
      slug: 'manager',
      description: 'Team management access',
      isSystem: true,
      permissions: ['user.read', 'campaign.read', 'campaign.create', 'campaign.update', 'campaign.execute', 'lead.read', 'lead.create', 'lead.update', 'ai.execute', 'data.query'],
      featureAccess: { campaigns: true, leads: true, ai: true, data: true },
      platformAccess: ['linkedin', 'email'],
    },
    {
      tenantId: tenant.id,
      name: 'User',
      slug: 'user',
      description: 'Standard user access',
      isSystem: true,
      permissions: ['campaign.read', 'campaign.create', 'lead.read', 'lead.create', 'ai.execute', 'data.query'],
      featureAccess: { campaigns: true, leads: true, ai: true },
      platformAccess: ['linkedin'],
    },
    {
      tenantId: tenant.id,
      name: 'Viewer',
      slug: 'viewer',
      description: 'Read-only access',
      isSystem: true,
      permissions: permissions.filter(p => p.key.endsWith('.read')).map(p => p.key),
      featureAccess: { readonly: true },
      platformAccess: [],
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        tenantId_slug: {
          tenantId: role.tenantId,
          slug: role.slug,
        },
      },
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
