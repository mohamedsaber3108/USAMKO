# USAMKO - Getting Started Guide

Welcome to USAMKO! This guide will help you get your platform up and running.

## Prerequisites

Before you begin, ensure you have the following installed:

- **.NET 8.0 SDK** or later
- **PostgreSQL 15+** (or use SQLite for development)
- **Redis** (optional, for caching)
- **Node.js 18+** and npm (for extension development)
- **Visual Studio 2022** or **JetBrains Rider** (recommended IDEs)

## Quick Start

### 1. Database Setup

**Option A: PostgreSQL (Recommended for production)**

```bash
# Install PostgreSQL and create database
createdb usamko

# Update connection string in config/appsettings.json
```

**Option B: SQLite (Quick start for development)**

```bash
# No setup needed - SQLite will create database automatically
# Change connection string in config/appsettings.json to:
# "DefaultConnection": "Data Source=usamko.db"
```

### 2. Configure API Keys

Create a `secrets.json` file or use environment variables:

```json
{
  "OPENAI_API_KEY": "your-openai-key",
  "CLAUDE_API_KEY": "your-claude-key",
  "FACEBOOK_APP_ID": "your-facebook-app-id",
  "FACEBOOK_APP_SECRET": "your-facebook-secret",
  "JWT_SECRET": "generate-a-secure-random-string",
  "ENCRYPTION_KEY": "generate-a-32-character-key"
}
```

**Generate secure keys:**
```bash
# JWT Secret (64 characters)
openssl rand -base64 64

# Encryption Key (32 bytes, base64 encoded)
openssl rand -base64 32
```

### 3. Build the Projects

```bash
# Restore all dependencies
dotnet restore USAMKO.sln

# Build entire solution
dotnet build USAMKO.sln

# Or build specific projects
dotnet build src/USAMKO.Core/USAMKO.Core.csproj
dotnet build src/USAMKO.Infrastructure/USAMKO.Infrastructure.csproj
```

### 4. Run Database Migrations

```bash
# Install EF Core tools if not already installed
dotnet tool install --global dotnet-ef

# Create and apply migrations
cd src/USAMKO.Infrastructure
dotnet ef migrations add InitialCreate
dotnet ef database update
```

### 5. Run the Application

**Desktop Application:**
```bash
dotnet run --project src/USAMKO.Desktop
```

**Web Admin:**
```bash
dotnet run --project src/USAMKO.Web
# Navigate to: https://localhost:5001
```

### 6. Build Chrome Extension

```bash
cd extension
npm install
npm run build

# For development with auto-rebuild:
npm run dev
```

**Load extension in Chrome:**
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/dist` folder

## Project Structure

```
USAMKO/
├── src/                          # Source code
│   ├── USAMKO.Core/             # Domain models and business logic
│   ├── USAMKO.Infrastructure/    # Data access and external services
│   ├── USAMKO.AI/               # AI integration layer
│   ├── USAMKO.Platforms/        # Social media connectors
│   ├── USAMKO.Automation/       # Workflow engine
│   ├── USAMKO.Plugins/          # Plugin system
│   ├── USAMKO.Desktop/          # Desktop application
│   └── USAMKO.Web/              # Web admin panel
├── tests/                        # Unit and integration tests
├── extension/                    # Chrome extension
├── config/                       # Configuration files
├── docs/                         # Documentation
└── data/                         # Data storage (databases, logs, etc.)
```

## Next Steps

### 1. **Set Up AI Providers**

Get API keys for the AI services you want to use:

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic Claude**: https://console.anthropic.com/
- **Azure OpenAI**: https://azure.microsoft.com/en-us/products/cognitive-services/openai-service

Add them to your `config/appsettings.json` or secrets file.

### 2. **Connect Social Media Accounts**

For each platform you want to integrate:

**Facebook/Instagram:**
1. Create a Facebook App at https://developers.facebook.com/
2. Get App ID and App Secret
3. Add to configuration

**Twitter/X:**
1. Apply for developer access at https://developer.twitter.com/
2. Create an app and get API keys
3. Add to configuration

**LinkedIn:**
1. Create app at https://www.linkedin.com/developers/
2. Get Client ID and Secret
3. Add to configuration

### 3. **Explore Features**

Once running, you can:

- ✅ Create and manage social media accounts
- ✅ Generate AI-powered content
- ✅ Build automation workflows
- ✅ Schedule posts across platforms
- ✅ Analyze engagement and performance
- ✅ Use the Chrome extension for quick actions

## Development Workflow

### Running Tests

```bash
# Run all tests
dotnet test

# Run with coverage
dotnet test /p:CollectCoverage=true

# Run specific test project
dotnet test tests/USAMKO.Core.Tests
```

### Debugging

**Visual Studio:**
- Open `USAMKO.sln`
- Set startup project (Desktop or Web)
- Press F5 to debug

**VS Code:**
- Install C# extension
- Open project folder
- Use provided launch configurations

### Hot Reload

Both Desktop and Web projects support hot reload:

```bash
dotnet watch run --project src/USAMKO.Desktop
dotnet watch run --project src/USAMKO.Web
```

## Common Tasks

### Add a New Entity

1. Create entity class in `src/USAMKO.Core/Domain/`
2. Add DbSet to `src/USAMKO.Infrastructure/Data/Contexts/ApplicationDbContext.cs`
3. Create migration: `dotnet ef migrations add AddNewEntity`
4. Apply migration: `dotnet ef database update`

### Add a New Platform Integration

1. Create folder in `src/USAMKO.Platforms/YourPlatform/`
2. Implement `IPlatformConnector` interface
3. Add platform-specific models and services
4. Register in dependency injection
5. Update configuration

### Create a Custom Plugin

1. Reference `USAMKO.Plugins.SDK`
2. Implement `IPlugin` interface
3. Build as separate assembly
4. Place in `plugins/` directory
5. Enable in configuration

### Add AI Provider

1. Create provider class in `src/USAMKO.AI/Models/YourProvider/`
2. Implement `IAIProvider` interface
3. Register in DI container
4. Add configuration section
5. Update UI to show new provider

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d usamko

# If permission denied, update pg_hba.conf
# Or use SQLite for simpler setup
```

### Port Already in Use

```bash
# Change ports in launchSettings.json
# Desktop: src/USAMKO.Desktop/Properties/launchSettings.json
# Web: src/USAMKO.Web/Properties/launchSettings.json
```

### Extension Not Loading

```bash
# Rebuild extension
cd extension
npm run clean
npm run build

# Check for TypeScript errors
npm run type-check

# View extension logs in Chrome DevTools
```

### Missing Dependencies

```bash
# Clear NuGet cache
dotnet nuget locals all --clear

# Restore packages
dotnet restore --force
```

## Configuration Best Practices

1. **Never commit secrets** - Use environment variables or secret management
2. **Use separate configs** - Development, Staging, Production
3. **Enable logging** - Set appropriate log levels
4. **Monitor performance** - Enable metrics and health checks
5. **Backup data** - Regular database backups

## Getting Help

- **Documentation**: See `docs/` folder
- **API Reference**: Build and view with XML documentation
- **Issues**: Check existing issues or create new one
- **Community**: Join Discord/Slack (if available)

## What's Next?

Now that you're set up, explore:

1. **AI Content Generation**: Try different AI models for content creation
2. **Workflow Builder**: Create automation workflows
3. **Multi-Platform Posting**: Schedule posts across multiple networks
4. **Analytics Dashboard**: Monitor performance metrics
5. **Plugin Development**: Extend functionality with custom plugins

---

**Welcome to USAMKO! Let's build something amazing.**

For detailed documentation, see the `/docs` folder.
For API reference, build the solution and check XML documentation.
For support, create an issue in the repository.
