using USAMKO.Core.Constants;

namespace USAMKO.Core.Domain;

/// <summary>
/// Represents a connected social media account
/// </summary>
public class PlatformAccount : AuditableEntity
{
    /// <summary>
    /// User who owns this account
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Navigation property to user
    /// </summary>
    public virtual User User { get; set; } = null!;

    /// <summary>
    /// Social media platform type
    /// </summary>
    public SocialPlatform Platform { get; set; }

    /// <summary>
    /// Account name/username on the platform
    /// </summary>
    public string AccountName { get; set; } = string.Empty;

    /// <summary>
    /// Display name for this account
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Platform-specific account ID
    /// </summary>
    public string PlatformAccountId { get; set; } = string.Empty;

    /// <summary>
    /// Encrypted credentials (JSON)
    /// </summary>
    public string? EncryptedCredentials { get; set; }

    /// <summary>
    /// OAuth access token (encrypted)
    /// </summary>
    public string? AccessToken { get; set; }

    /// <summary>
    /// OAuth refresh token (encrypted)
    /// </summary>
    public string? RefreshToken { get; set; }

    /// <summary>
    /// Token expiration date
    /// </summary>
    public DateTime? TokenExpiresAt { get; set; }

    /// <summary>
    /// Account status
    /// </summary>
    public AccountStatus Status { get; set; } = AccountStatus.Active;

    /// <summary>
    /// Last time account was successfully synced
    /// </summary>
    public DateTime? LastSyncAt { get; set; }

    /// <summary>
    /// Last sync error message
    /// </summary>
    public string? LastSyncError { get; set; }

    /// <summary>
    /// Profile picture URL from the platform
    /// </summary>
    public string? ProfilePictureUrl { get; set; }

    /// <summary>
    /// Number of followers/connections
    /// </summary>
    public long FollowerCount { get; set; }

    /// <summary>
    /// Number following/connected to
    /// </summary>
    public long FollowingCount { get; set; }

    /// <summary>
    /// Account metadata (JSON)
    /// </summary>
    public string? Metadata { get; set; }

    /// <summary>
    /// Whether this account is the default for its platform
    /// </summary>
    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// Rate limit information
    /// </summary>
    public string? RateLimitInfo { get; set; }
}
