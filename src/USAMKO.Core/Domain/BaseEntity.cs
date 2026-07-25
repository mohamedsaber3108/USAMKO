namespace USAMKO.Core.Domain;

/// <summary>
/// Base entity class for all domain entities
/// </summary>
public abstract class BaseEntity
{
    /// <summary>
    /// Unique identifier for the entity
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Date and time when the entity was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date and time when the entity was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Soft delete flag
    /// </summary>
    public bool IsDeleted { get; set; } = false;

    /// <summary>
    /// Date and time when the entity was deleted
    /// </summary>
    public DateTime? DeletedAt { get; set; }
}

/// <summary>
/// Base entity with user tracking
/// </summary>
public abstract class AuditableEntity : BaseEntity
{
    /// <summary>
    /// ID of the user who created this entity
    /// </summary>
    public Guid? CreatedBy { get; set; }

    /// <summary>
    /// ID of the user who last updated this entity
    /// </summary>
    public Guid? UpdatedBy { get; set; }

    /// <summary>
    /// ID of the user who deleted this entity
    /// </summary>
    public Guid? DeletedBy { get; set; }
}
