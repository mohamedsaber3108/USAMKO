namespace USAMKO.Core.Constants;

/// <summary>
/// System-wide constants for USAMKO platform
/// </summary>
public static class SystemConstants
{
    /// <summary>
    /// Application name
    /// </summary>
    public const string AppName = "USAMKO";

    /// <summary>
    /// Application version
    /// </summary>
    public const string AppVersion = "1.0.0";

    /// <summary>
    /// Default culture
    /// </summary>
    public const string DefaultCulture = "en-US";

    /// <summary>
    /// Default timezone
    /// </summary>
    public const string DefaultTimeZone = "UTC";

    /// <summary>
    /// Maximum file upload size in bytes (100 MB)
    /// </summary>
    public const long MaxFileUploadSize = 100 * 1024 * 1024;

    /// <summary>
    /// Session timeout in minutes
    /// </summary>
    public const int SessionTimeoutMinutes = 60;

    /// <summary>
    /// Password minimum length
    /// </summary>
    public const int PasswordMinLength = 8;

    /// <summary>
    /// Maximum login attempts before lockout
    /// </summary>
    public const int MaxLoginAttempts = 5;

    /// <summary>
    /// Lockout duration in minutes
    /// </summary>
    public const int LockoutDurationMinutes = 30;

    /// <summary>
    /// Default page size for pagination
    /// </summary>
    public const int DefaultPageSize = 25;

    /// <summary>
    /// Maximum page size for pagination
    /// </summary>
    public const int MaxPageSize = 100;

    /// <summary>
    /// Cache expiration in minutes
    /// </summary>
    public const int CacheExpirationMinutes = 30;

    /// <summary>
    /// Rate limit requests per minute
    /// </summary>
    public const int RateLimitRequestsPerMinute = 100;
}

/// <summary>
/// Configuration keys
/// </summary>
public static class ConfigKeys
{
    public const string ConnectionStrings = "ConnectionStrings";
    public const string DatabaseConnection = "ConnectionStrings:DefaultConnection";
    public const string RedisConnection = "ConnectionStrings:Redis";

    public const string AI = "AI";
    public const string AIProviders = "AI:Providers";
    public const string AIOpenAI = "AI:Providers:OpenAI";
    public const string AIClaude = "AI:Providers:Claude";
    public const string AIAzure = "AI:Providers:Azure";
    public const string AILocal = "AI:Providers:Local";

    public const string Platforms = "Platforms";
    public const string PlatformFacebook = "Platforms:Facebook";
    public const string PlatformInstagram = "Platforms:Instagram";
    public const string PlatformTwitter = "Platforms:Twitter";

    public const string Security = "Security";
    public const string SecurityEncryptionKey = "Security:EncryptionKey";
    public const string SecurityJwtSecret = "Security:JwtSecret";
    public const string SecurityJwtIssuer = "Security:JwtIssuer";
    public const string SecurityJwtAudience = "Security:JwtAudience";

    public const string Features = "Features";
    public const string Logging = "Logging";
    public const string Plugins = "Plugins";
}

/// <summary>
/// Cache keys
/// </summary>
public static class CacheKeys
{
    public const string UserPrefix = "user:";
    public const string PlatformAccountPrefix = "platform_account:";
    public const string WorkflowPrefix = "workflow:";
    public const string ContentPrefix = "content:";
    public const string SettingsPrefix = "settings:";

    public static string UserKey(Guid userId) => $"{UserPrefix}{userId}";
    public static string PlatformAccountKey(Guid accountId) => $"{PlatformAccountPrefix}{accountId}";
    public static string WorkflowKey(Guid workflowId) => $"{WorkflowPrefix}{workflowId}";
    public static string ContentKey(Guid contentId) => $"{ContentPrefix}{contentId}";
}

/// <summary>
/// Error messages
/// </summary>
public static class ErrorMessages
{
    public const string UserNotFound = "User not found.";
    public const string InvalidCredentials = "Invalid username or password.";
    public const string AccountLocked = "Account is locked due to multiple failed login attempts.";
    public const string EmailNotConfirmed = "Email address is not confirmed.";
    public const string InvalidToken = "Invalid or expired token.";
    public const string DuplicateUsername = "Username already exists.";
    public const string DuplicateEmail = "Email address already exists.";
    public const string WeakPassword = "Password does not meet security requirements.";

    public const string PlatformAccountNotFound = "Platform account not found.";
    public const string PlatformConnectionFailed = "Failed to connect to platform.";
    public const string PlatformAuthenticationFailed = "Platform authentication failed.";
    public const string PlatformRateLimitExceeded = "Platform rate limit exceeded.";

    public const string WorkflowNotFound = "Workflow not found.";
    public const string WorkflowExecutionFailed = "Workflow execution failed.";
    public const string InvalidWorkflowConfiguration = "Invalid workflow configuration.";

    public const string AIProviderNotAvailable = "AI provider is not available.";
    public const string AIGenerationFailed = "AI content generation failed.";
    public const string AIQuotaExceeded = "AI usage quota exceeded.";

    public const string UnauthorizedAccess = "Unauthorized access.";
    public const string InsufficientPermissions = "Insufficient permissions.";
    public const string ResourceNotFound = "Requested resource not found.";
    public const string InvalidRequest = "Invalid request.";
    public const string InternalServerError = "An internal server error occurred.";
}
