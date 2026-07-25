using Cronos;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using USAMKO.Automation.Workflows;
using USAMKO.Core.Domain;
using USAMKO.Core.Interfaces;

namespace USAMKO.Automation.Scheduling;

/// <summary>
/// Background service that runs scheduled workflows.
/// Runs on YOUR machine/server — no external scheduler dependency.
/// </summary>
public class WorkflowScheduler : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WorkflowScheduler> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromSeconds(60);

    public WorkflowScheduler(
        IServiceProvider serviceProvider,
        ILogger<WorkflowScheduler> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("USAMKO Workflow Scheduler started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndRunScheduledWorkflows(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in workflow scheduler loop");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("USAMKO Workflow Scheduler stopped");
    }

    private async Task CheckAndRunScheduledWorkflows(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var workflowRepo = scope.ServiceProvider.GetRequiredService<IRepository<Workflow>>();
        var workflowEngine = scope.ServiceProvider.GetRequiredService<IWorkflowEngine>();

        var activeWorkflows = await workflowRepo.FindAsync(
            w => w.IsActive && w.Schedule != null, ct);

        foreach (var workflow in activeWorkflows)
        {
            if (ct.IsCancellationRequested) break;

            if (ShouldRun(workflow))
            {
                _logger.LogInformation("Triggering scheduled workflow: {Name}", workflow.Name);

                _ = Task.Run(async () =>
                {
                    try
                    {
                        await workflowEngine.ExecuteAsync(workflow, ct);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Scheduled workflow failed: {Name}", workflow.Name);
                    }
                }, ct);

                // Update next run time
                workflow.LastRunAt = DateTime.UtcNow;
                workflow.NextRunAt = GetNextRunTime(workflow.Schedule!, workflow.TimeZone);
                await workflowRepo.UpdateAsync(workflow, ct);
            }
        }
    }

    private bool ShouldRun(Workflow workflow)
    {
        if (string.IsNullOrEmpty(workflow.Schedule)) return false;

        var now = DateTime.UtcNow;

        // If NextRunAt is set and in the past, it's time to run
        if (workflow.NextRunAt.HasValue && workflow.NextRunAt.Value <= now)
            return true;

        // If never run and schedule matches now
        if (!workflow.LastRunAt.HasValue)
        {
            var nextRun = GetNextRunTime(workflow.Schedule, workflow.TimeZone);
            return nextRun.HasValue && nextRun.Value <= now;
        }

        return false;
    }

    private DateTime? GetNextRunTime(string cronExpression, string timeZone)
    {
        try
        {
            var expression = CronExpression.Parse(cronExpression);
            var tz = TimeZoneInfo.FindSystemTimeZoneById(timeZone);
            var next = expression.GetNextOccurrence(DateTime.UtcNow, tz);
            return next;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Invalid cron expression: {Cron}", cronExpression);
            return null;
        }
    }
}
