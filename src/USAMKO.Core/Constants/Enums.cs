namespace USAMKO.Core.Constants;

/// <summary>
/// User roles in the system
/// </summary>
public enum UserRole
{
    User = 0,
    Admin = 1,
    SuperAdmin = 2
}

/// <summary>
/// Subscription tiers
/// </summary>
public enum SubscriptionTier
{
    Free = 0,
    Basic = 1,
    Pro = 2,
    Enterprise = 3
}

/// <summary>
/// Supported social media platforms
/// </summary>
public enum SocialPlatform
{
    Facebook = 0,
    Instagram = 1,
    Twitter = 2,
    LinkedIn = 3,
    Pinterest = 4,
    Reddit = 5,
    YouTube = 6,
    TikTok = 7,
    Telegram = 8,
    WhatsApp = 9,
    VK = 10,
    Snapchat = 11,
    Threads = 12
}

/// <summary>
/// Account status
/// </summary>
public enum AccountStatus
{
    Active = 0,
    Inactive = 1,
    Suspended = 2,
    TokenExpired = 3,
    AuthenticationFailed = 4,
    RateLimited = 5,
    Banned = 6
}

/// <summary>
/// Workflow categories
/// </summary>
public enum WorkflowCategory
{
    Custom = 0,
    Publishing = 1,
    Engagement = 2,
    Analytics = 3,
    ContentCuration = 4,
    Monitoring = 5
}

/// <summary>
/// Execution status
/// </summary>
public enum ExecutionStatus
{
    Pending = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    Cancelled = 4,
    Retrying = 5
}

/// <summary>
/// Content types
/// </summary>
public enum ContentType
{
    Text = 0,
    Image = 1,
    Video = 2,
    Audio = 3,
    Document = 4,
    Link = 5,
    Mixed = 6
}

/// <summary>
/// Content status
/// </summary>
public enum ContentStatus
{
    Draft = 0,
    Published = 1,
    Scheduled = 2,
    Archived = 3
}

/// <summary>
/// AI providers
/// </summary>
public enum AIProvider
{
    OpenAI = 0,
    Claude = 1,
    Azure = 2,
    Local = 3,
    Custom = 4
}

/// <summary>
/// Post status
/// </summary>
public enum PostStatus
{
    Draft = 0,
    Scheduled = 1,
    Publishing = 2,
    Published = 3,
    Failed = 4,
    Cancelled = 5
}

/// <summary>
/// Log levels
/// </summary>
public enum LogLevel
{
    Trace = 0,
    Debug = 1,
    Information = 2,
    Warning = 3,
    Error = 4,
    Critical = 5
}
