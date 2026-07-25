namespace USAMKO.Core.Domain;

/// <summary>
/// Represents an AI prompt template
/// </summary>
public class PromptTemplate : AuditableEntity
{
    /// <summary>
    /// User who owns this template
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Navigation property to user
    /// </summary>
    public virtual User User { get; set; } = null!;

    /// <summary>
    /// Template name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Template description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Template category
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Prompt template text with placeholders
    /// </summary>
    public string Template { get; set; } = string.Empty;

    /// <summary>
    /// Template variables definition (JSON)
    /// </summary>
    public string? Variables { get; set; }

    /// <summary>
    /// System message for the AI
    /// </summary>
    public string? SystemMessage { get; set; }

    /// <summary>
    /// Default AI model to use
    /// </summary>
    public string? DefaultModel { get; set; }

    /// <summary>
    /// Default temperature setting
    /// </summary>
    public double? DefaultTemperature { get; set; }

    /// <summary>
    /// Default max tokens
    /// </summary>
    public int? DefaultMaxTokens { get; set; }

    /// <summary>
    /// Whether this template is public
    /// </summary>
    public bool IsPublic { get; set; } = false;

    /// <summary>
    /// Number of times this template has been used
    /// </summary>
    public int UsageCount { get; set; } = 0;

    /// <summary>
    /// Tags for organization
    /// </summary>
    public string? Tags { get; set; }
}
