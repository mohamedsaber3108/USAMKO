using Microsoft.Extensions.DependencyInjection;

namespace USAMKO.Plugins.SDK;

/// <summary>
/// Base plugin interface. Implement this to create YOUR own plugins.
/// Plugins can add new platforms, AI providers, workflow steps, or UI components.
/// </summary>
public interface IPlugin
{
    string Name { get; }
    string Version { get; }
    string Description { get; }
    string Author { get; }

    Task InitializeAsync(IPluginContext context);
    Task ShutdownAsync();
}

/// <summary>
/// Context provided to plugins during initialization
/// </summary>
public interface IPluginContext
{
    IServiceCollection Services { get; }
    IPluginConfiguration Configuration { get; }
    string PluginDirectory { get; }

    void RegisterWorkflowStep(string stepType, Type handlerType);
    void RegisterPlatformConnector(Type connectorType);
    void RegisterAIProvider(Type providerType);
}

/// <summary>
/// Plugin configuration interface
/// </summary>
public interface IPluginConfiguration
{
    string? GetValue(string key);
    T? GetSection<T>(string section) where T : class, new();
    void SetValue(string key, string value);
}

/// <summary>
/// Plugin metadata loaded from plugin manifest
/// </summary>
public class PluginManifest
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0.0";
    public string Description { get; set; } = string.Empty;
    public string Author { get; set; } = string.Empty;
    public string EntryPoint { get; set; } = string.Empty;
    public List<string> Dependencies { get; set; } = new();
    public Dictionary<string, string> Configuration { get; set; } = new();
    public string? MinPlatformVersion { get; set; }
}
