using USAMKO.Core.Constants;

namespace USAMKO.Core.Domain;

/// <summary>
/// Represents an automation workflow
/// </summary>
public class Workflow : AuditableEntity
{
    /// <summary>
    /// User who owns this workflow
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Navigation property to user
    /// </summary>
    public virtual User User { get; set; } = null!;

    /// <summary>
    /// Workflow name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Workflow description
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Workflow category
    /// </summary>
    public WorkflowCategory Category { get; set; } = WorkflowCategory.Custom;

    /// <summary>
    /// Workflow configuration (JSON)
    /// </summary>
    public string Configuration { get; set; } = "{}";

    /// <summary>
    /// Whether this workflow is active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Cron expression for scheduling
    /// </summary>
    public string? Schedule { get; set; }

    /// <summary>
    /// Timezone for schedule
    /// </summary>
    public string TimeZone { get; set; } = "UTC";

    /// <summary>
    /// Next scheduled run time
    /// </summary>
    public DateTime? NextRunAt { get; set; }

    /// <summary>
    /// Last execution time
    /// </summary>
    public DateTime? LastRunAt { get; set; }

    /// <summary>
    /// Last execution status
    /// </summary>
    public ExecutionStatus? LastRunStatus { get; set; }

    /// <summary>
    /// Total number of executions
    /// </summary>
    public int ExecutionCount { get; set; } = 0;

    /// <summary>
    /// Number of successful executions
    /// </summary>
    public int SuccessCount { get; set; } = 0;

    /// <summary>
    /// Number of failed executions
    /// </summary>
    public int FailureCount { get; set; } = 0;

    /// <summary>
    /// Workflow version
    /// </summary>
    public int Version { get; set; } = 1;

    /// <summary>
    /// Tags for organization
    /// </summary>
    public string? Tags { get; set; }

    /// <summary>
    /// Navigation property to executions
    /// </summary>
    public virtual ICollection<WorkflowExecution> Executions { get; set; } = new List<WorkflowExecution>();
}
