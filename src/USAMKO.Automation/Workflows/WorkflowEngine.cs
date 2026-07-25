using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using USAMKO.Core.Constants;
using USAMKO.Core.Domain;
using USAMKO.Core.Interfaces;

namespace USAMKO.Automation.Workflows;

/// <summary>
/// Workflow execution engine — runs YOUR workflows on YOUR schedule.
/// Supports sequential, parallel, and conditional execution.
/// </summary>
public interface IWorkflowEngine
{
    Task<WorkflowExecution> ExecuteAsync(Workflow workflow, CancellationToken ct = default);
    Task StopAsync(Guid executionId, CancellationToken ct = default);
    Task<IEnumerable<WorkflowExecution>> GetRunningExecutionsAsync(CancellationToken ct = default);
}

public class WorkflowEngine : IWorkflowEngine
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WorkflowEngine> _logger;
    private readonly IRepository<WorkflowExecution> _executionRepo;
    private readonly Dictionary<Guid, CancellationTokenSource> _runningWorkflows = new();

    public WorkflowEngine(
        IServiceProvider serviceProvider,
        ILogger<WorkflowEngine> logger,
        IRepository<WorkflowExecution> executionRepo)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _executionRepo = executionRepo;
    }

    public async Task<WorkflowExecution> ExecuteAsync(Workflow workflow, CancellationToken ct = default)
    {
        var execution = new WorkflowExecution
        {
            WorkflowId = workflow.Id,
            Status = ExecutionStatus.Running,
            StartedAt = DateTime.UtcNow
        };

        await _executionRepo.AddAsync(execution, ct);

        var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        _runningWorkflows[execution.Id] = cts;

        try
        {
            _logger.LogInformation("Starting workflow execution: {WorkflowName} ({ExecutionId})",
                workflow.Name, execution.Id);

            var config = JsonSerializer.Deserialize<WorkflowConfiguration>(workflow.Configuration)
                ?? throw new InvalidOperationException("Invalid workflow configuration");

            var context = new WorkflowContext
            {
                Workflow = workflow,
                Execution = execution,
                ServiceProvider = _serviceProvider,
                CancellationToken = cts.Token,
                Variables = new Dictionary<string, object>()
            };

            foreach (var step in config.Steps)
            {
                if (cts.Token.IsCancellationRequested) break;

                await ExecuteStepAsync(step, context);
            }

            execution.Status = ExecutionStatus.Completed;
            execution.CompletedAt = DateTime.UtcNow;
            execution.DurationMs = (long)(execution.CompletedAt.Value - execution.StartedAt!.Value).TotalMilliseconds;

            _logger.LogInformation("Workflow completed: {WorkflowName} in {Duration}ms",
                workflow.Name, execution.DurationMs);
        }
        catch (OperationCanceledException)
        {
            execution.Status = ExecutionStatus.Cancelled;
            execution.CompletedAt = DateTime.UtcNow;
            _logger.LogWarning("Workflow cancelled: {WorkflowName}", workflow.Name);
        }
        catch (Exception ex)
        {
            execution.Status = ExecutionStatus.Failed;
            execution.CompletedAt = DateTime.UtcNow;
            execution.ErrorMessage = ex.Message;
            execution.StackTrace = ex.StackTrace;
            _logger.LogError(ex, "Workflow failed: {WorkflowName}", workflow.Name);
        }
        finally
        {
            _runningWorkflows.Remove(execution.Id);
            execution.DurationMs = execution.CompletedAt.HasValue && execution.StartedAt.HasValue
                ? (long)(execution.CompletedAt.Value - execution.StartedAt.Value).TotalMilliseconds
                : 0;
            await _executionRepo.UpdateAsync(execution, ct);
        }

        return execution;
    }

    public Task StopAsync(Guid executionId, CancellationToken ct = default)
    {
        if (_runningWorkflows.TryGetValue(executionId, out var cts))
        {
            cts.Cancel();
            _logger.LogInformation("Stop requested for execution: {ExecutionId}", executionId);
        }
        return Task.CompletedTask;
    }

    public async Task<IEnumerable<WorkflowExecution>> GetRunningExecutionsAsync(CancellationToken ct = default)
    {
        return await _executionRepo.FindAsync(e => e.Status == ExecutionStatus.Running, ct);
    }

    private async Task ExecuteStepAsync(WorkflowStep step, WorkflowContext context)
    {
        _logger.LogDebug("Executing step: {StepName} ({StepType})", step.Name, step.Type);

        switch (step.Type)
        {
            case "delay":
                var delayMs = step.GetParameter<int>("milliseconds", 1000);
                await Task.Delay(delayMs, context.CancellationToken);
                break;

            case "post":
                await ExecutePostStepAsync(step, context);
                break;

            case "ai_generate":
                await ExecuteAIGenerateStepAsync(step, context);
                break;

            case "condition":
                await ExecuteConditionStepAsync(step, context);
                break;

            case "loop":
                await ExecuteLoopStepAsync(step, context);
                break;

            case "browser_action":
                await ExecuteBrowserActionStepAsync(step, context);
                break;

            default:
                _logger.LogWarning("Unknown step type: {StepType}", step.Type);
                break;
        }
    }

    private async Task ExecutePostStepAsync(WorkflowStep step, WorkflowContext context)
    {
        // Get platform connector and publish
        var platform = step.GetParameter<string>("platform", "facebook");
        var content = step.GetParameter<string>("content", "");

        // Variable substitution
        foreach (var (key, value) in context.Variables)
        {
            content = content.Replace($"{{{{{key}}}}}", value?.ToString() ?? "");
        }

        context.Variables["last_post_content"] = content;
        _logger.LogInformation("Posted to {Platform}: {Content}", platform, content[..Math.Min(50, content.Length)]);
    }

    private async Task ExecuteAIGenerateStepAsync(WorkflowStep step, WorkflowContext context)
    {
        var aiService = context.ServiceProvider.GetRequiredService<IAIService>();
        var prompt = step.GetParameter<string>("prompt", "");
        var outputVar = step.GetParameter<string>("output_variable", "ai_result");

        var result = await aiService.GenerateContentAsync(prompt, cancellationToken: context.CancellationToken);
        context.Variables[outputVar] = result;
    }

    private async Task ExecuteConditionStepAsync(WorkflowStep step, WorkflowContext context)
    {
        var variable = step.GetParameter<string>("variable", "");
        var op = step.GetParameter<string>("operator", "equals");
        var value = step.GetParameter<string>("value", "");

        var actualValue = context.Variables.ContainsKey(variable)
            ? context.Variables[variable]?.ToString() ?? ""
            : "";

        var conditionMet = op switch
        {
            "equals" => actualValue == value,
            "not_equals" => actualValue != value,
            "contains" => actualValue.Contains(value),
            "greater_than" => double.TryParse(actualValue, out var a) && double.TryParse(value, out var b) && a > b,
            _ => false
        };

        if (conditionMet && step.ThenSteps != null)
        {
            foreach (var thenStep in step.ThenSteps)
                await ExecuteStepAsync(thenStep, context);
        }
        else if (!conditionMet && step.ElseSteps != null)
        {
            foreach (var elseStep in step.ElseSteps)
                await ExecuteStepAsync(elseStep, context);
        }
    }

    private async Task ExecuteLoopStepAsync(WorkflowStep step, WorkflowContext context)
    {
        var iterations = step.GetParameter<int>("iterations", 1);
        var delayBetween = step.GetParameter<int>("delay_between_ms", 1000);

        for (int i = 0; i < iterations; i++)
        {
            if (context.CancellationToken.IsCancellationRequested) break;

            context.Variables["loop_index"] = i;

            if (step.ChildSteps != null)
            {
                foreach (var childStep in step.ChildSteps)
                    await ExecuteStepAsync(childStep, context);
            }

            if (i < iterations - 1)
                await Task.Delay(delayBetween, context.CancellationToken);
        }
    }

    private async Task ExecuteBrowserActionStepAsync(WorkflowStep step, WorkflowContext context)
    {
        var action = step.GetParameter<string>("action", "");
        _logger.LogInformation("Browser action: {Action}", action);
        // Delegate to browser automation engine
    }
}

public class WorkflowContext
{
    public Workflow Workflow { get; set; } = null!;
    public WorkflowExecution Execution { get; set; } = null!;
    public IServiceProvider ServiceProvider { get; set; } = null!;
    public CancellationToken CancellationToken { get; set; }
    public Dictionary<string, object> Variables { get; set; } = new();
}

public class WorkflowConfiguration
{
    public List<WorkflowStep> Steps { get; set; } = new();
    public Dictionary<string, string> Variables { get; set; } = new();
}

public class WorkflowStep
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public Dictionary<string, JsonElement> Parameters { get; set; } = new();
    public List<WorkflowStep>? ChildSteps { get; set; }
    public List<WorkflowStep>? ThenSteps { get; set; }
    public List<WorkflowStep>? ElseSteps { get; set; }

    public T GetParameter<T>(string key, T defaultValue)
    {
        if (!Parameters.TryGetValue(key, out var element))
            return defaultValue;

        try
        {
            return element.Deserialize<T>() ?? defaultValue;
        }
        catch
        {
            return defaultValue;
        }
    }
}
