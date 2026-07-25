using USAMKO.Core.Constants;

namespace USAMKO.Core.Domain;

/// <summary>
/// Represents a single execution of a workflow
/// </summary>
public class WorkflowExecution : BaseEntity
{
    /// <summary>
    /// Workflow that was executed
    /// </summary>
    public Guid WorkflowId { get; set; }

    /// <summary>
    /// Navigation property to workflow
    /// </summary>
    public virtual Workflow Workflow { get; set; } = null!;

    /// <summary>
    /// Execution status
    /// </summary>
    public ExecutionStatus Status { get; set; } = ExecutionStatus.Pending;

    /// <summary>
    /// When execution started
    /// </summary>
    public DateTime? StartedAt { get; set; }

    /// <summary>
    /// When execution completed
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Execution duration in milliseconds
    /// </summary>
    public long? DurationMs { get; set; }

    /// <summary>
    /// Execution result data (JSON)
    /// </summary>
    public string? Result { get; set; }

    /// <summary>
    /// Error message if failed
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Stack trace if error occurred
    /// </summary>
    public string? StackTrace { get; set; }

    /// <summary>
    /// Number of retry attempts
    /// </summary>
    public int RetryCount { get; set; } = 0;

    /// <summary>
    /// Execution logs
    /// </summary>
    public string? Logs { get; set; }

    /// <summary>
    /// Input parameters (JSON)
    /// </summary>
    public string? InputParameters { get; set; }

    /// <summary>
    /// Output data (JSON)
    /// </summary>
    public string? OutputData { get; set; }
}
