using USAMKO.Core.Constants;

namespace USAMKO.Platforms.Common;

/// <summary>
/// Base interface for all platform connectors.
/// Each connector uses YOUR credentials, YOUR app registrations, YOUR domains.
/// </summary>
public interface IPlatformConnector
{
    SocialPlatform Platform { get; }
    string PlatformName { get; }
    bool IsConfigured { get; }

    Task<bool> ValidateCredentialsAsync(PlatformCredentials credentials, CancellationToken ct = default);
    Task<PlatformProfile> GetProfileAsync(PlatformCredentials credentials, CancellationToken ct = default);
    Task<PostResult> PublishPostAsync(PostRequest request, CancellationToken ct = default);
    Task<PostResult> SchedulePostAsync(PostRequest request, DateTime scheduledTime, CancellationToken ct = default);
    Task<bool> DeletePostAsync(string postId, PlatformCredentials credentials, CancellationToken ct = default);
    Task<IEnumerable<PostAnalytics>> GetPostAnalyticsAsync(string postId, PlatformCredentials credentials, CancellationToken ct = default);
    Task<IEnumerable<PlatformComment>> GetCommentsAsync(string postId, PlatformCredentials credentials, CancellationToken ct = default);
    Task<bool> ReplyToCommentAsync(string commentId, string reply, PlatformCredentials credentials, CancellationToken ct = default);
    Task<IEnumerable<PlatformMessage>> GetMessagesAsync(PlatformCredentials credentials, int limit = 50, CancellationToken ct = default);
    Task<bool> SendMessageAsync(string recipientId, string message, PlatformCredentials credentials, CancellationToken ct = default);
}

/// <summary>
/// Credentials for a platform account — encrypted at rest, decrypted only in memory
/// </summary>
public class PlatformCredentials
{
    public string AccountId { get; set; } = string.Empty;
    public string? AccessToken { get; set; }
    public string? RefreshToken { get; set; }
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? CookieSession { get; set; }
    public Dictionary<string, string> ExtraParameters { get; set; } = new();
    public DateTime? TokenExpiresAt { get; set; }
}

public class PlatformProfile
{
    public string Id { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? ProfilePictureUrl { get; set; }
    public string? Bio { get; set; }
    public long FollowerCount { get; set; }
    public long FollowingCount { get; set; }
    public long PostCount { get; set; }
    public bool IsVerified { get; set; }
    public Dictionary<string, object> Extra { get; set; } = new();
}

public class PostRequest
{
    public PlatformCredentials Credentials { get; set; } = new();
    public string Content { get; set; } = string.Empty;
    public List<string> MediaUrls { get; set; } = new();
    public List<string> Hashtags { get; set; } = new();
    public string? LinkUrl { get; set; }
    public string? Location { get; set; }
    public Dictionary<string, string> PlatformSpecific { get; set; } = new();
}

public class PostResult
{
    public bool Success { get; set; }
    public string? PostId { get; set; }
    public string? PostUrl { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public class PostAnalytics
{
    public string PostId { get; set; } = string.Empty;
    public long Likes { get; set; }
    public long Comments { get; set; }
    public long Shares { get; set; }
    public long Views { get; set; }
    public long Reach { get; set; }
    public long Impressions { get; set; }
    public double EngagementRate { get; set; }
    public DateTime MeasuredAt { get; set; }
}

public class PlatformComment
{
    public string Id { get; set; } = string.Empty;
    public string AuthorId { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public long Likes { get; set; }
}

public class PlatformMessage
{
    public string Id { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public bool IsRead { get; set; }
}
