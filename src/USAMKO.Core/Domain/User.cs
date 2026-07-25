using USAMKO.Core.Constants;

namespace USAMKO.Core.Domain;

/// <summary>
/// Represents a user in the USAMKO platform
/// </summary>
public class User : AuditableEntity
{
    /// <summary>
    /// Unique username for login
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// User's email address
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Hashed password
    /// </summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// User's first name
    /// </summary>
    public string? FirstName { get; set; }

    /// <summary>
    /// User's last name
    /// </summary>
    public string? LastName { get; set; }

    /// <summary>
    /// Full name computed property
    /// </summary>
    public string FullName => $"{FirstName} {LastName}".Trim();

    /// <summary>
    /// User's phone number
    /// </summary>
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// User's profile picture URL
    /// </summary>
    public string? ProfilePictureUrl { get; set; }

    /// <summary>
    /// Whether the user account is active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Whether email is confirmed
    /// </summary>
    public bool EmailConfirmed { get; set; } = false;

    /// <summary>
    /// Whether phone number is confirmed
    /// </summary>
    public bool PhoneNumberConfirmed { get; set; } = false;

    /// <summary>
    /// Whether two-factor authentication is enabled
    /// </summary>
    public bool TwoFactorEnabled { get; set; } = false;

    /// <summary>
    /// Two-factor authentication secret
    /// </summary>
    public string? TwoFactorSecret { get; set; }

    /// <summary>
    /// User's role
    /// </summary>
    public UserRole Role { get; set; } = UserRole.User;

    /// <summary>
    /// User's subscription tier
    /// </summary>
    public SubscriptionTier SubscriptionTier { get; set; } = SubscriptionTier.Free;

    /// <summary>
    /// Subscription expiry date
    /// </summary>
    public DateTime? SubscriptionExpiresAt { get; set; }

    /// <summary>
    /// Last login timestamp
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// Last login IP address
    /// </summary>
    public string? LastLoginIp { get; set; }

    /// <summary>
    /// Failed login attempts
    /// </summary>
    public int FailedLoginAttempts { get; set; } = 0;

    /// <summary>
    /// Account lockout end date
    /// </summary>
    public DateTime? LockoutEnd { get; set; }

    /// <summary>
    /// User preferences stored as JSON
    /// </summary>
    public string? Preferences { get; set; }

    /// <summary>
    /// Navigation property to platform accounts
    /// </summary>
    public virtual ICollection<PlatformAccount> PlatformAccounts { get; set; } = new List<PlatformAccount>();

    /// <summary>
    /// Navigation property to workflows
    /// </summary>
    public virtual ICollection<Workflow> Workflows { get; set; } = new List<Workflow>();

    /// <summary>
    /// Navigation property to content library
    /// </summary>
    public virtual ICollection<ContentItem> ContentLibrary { get; set; } = new List<ContentItem>();
}
