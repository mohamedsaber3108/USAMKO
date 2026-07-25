using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using USAMKO.Plugins.SDK;

namespace USAMKO.Plugins.Loader;

/// <summary>
/// Dynamic plugin loader — loads YOUR plugins from the plugins directory.
/// Each plugin runs in its own AssemblyLoadContext for isolation.
/// </summary>
public interface IPluginLoader
{
    Task<IEnumerable<IPlugin>> LoadPluginsAsync(string pluginDirectory);
    Task UnloadPluginAsync(string pluginId);
    IEnumerable<PluginManifest> GetLoadedPlugins();
}

public class PluginLoader : IPluginLoader
{
    private readonly ILogger<PluginLoader> _logger;
    private readonly Dictionary<string, LoadedPlugin> _loadedPlugins = new();

    public PluginLoader(ILogger<PluginLoader> logger)
    {
        _logger = logger;
    }

    public async Task<IEnumerable<IPlugin>> LoadPluginsAsync(string pluginDirectory)
    {
        var plugins = new List<IPlugin>();

        if (!Directory.Exists(pluginDirectory))
        {
            _logger.LogWarning("Plugin directory does not exist: {Directory}", pluginDirectory);
            Directory.CreateDirectory(pluginDirectory);
            return plugins;
        }

        foreach (var dir in Directory.GetDirectories(pluginDirectory))
        {
            try
            {
                var manifestPath = Path.Combine(dir, "plugin.json");
                if (!File.Exists(manifestPath))
                {
                    _logger.LogWarning("No plugin.json found in: {Directory}", dir);
                    continue;
                }

                var manifestJson = await File.ReadAllTextAsync(manifestPath);
                var manifest = JsonSerializer.Deserialize<PluginManifest>(manifestJson);

                if (manifest == null)
                {
                    _logger.LogWarning("Invalid plugin manifest in: {Directory}", dir);
                    continue;
                }

                var assemblyPath = Path.Combine(dir, manifest.EntryPoint);
                if (!File.Exists(assemblyPath))
                {
                    _logger.LogWarning("Plugin assembly not found: {Path}", assemblyPath);
                    continue;
                }

                var loadContext = new PluginAssemblyLoadContext(assemblyPath);
                var assembly = loadContext.LoadFromAssemblyPath(assemblyPath);

                var pluginType = assembly.GetTypes()
                    .FirstOrDefault(t => typeof(IPlugin).IsAssignableFrom(t) && !t.IsAbstract);

                if (pluginType == null)
                {
                    _logger.LogWarning("No IPlugin implementation found in: {Assembly}", assemblyPath);
                    continue;
                }

                var plugin = (IPlugin)Activator.CreateInstance(pluginType)!;

                _loadedPlugins[manifest.Id] = new LoadedPlugin
                {
                    Manifest = manifest,
                    Plugin = plugin,
                    LoadContext = loadContext,
                    Directory = dir
                };

                plugins.Add(plugin);
                _logger.LogInformation("Loaded plugin: {Name} v{Version}", manifest.Name, manifest.Version);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load plugin from: {Directory}", dir);
            }
        }

        return plugins;
    }

    public Task UnloadPluginAsync(string pluginId)
    {
        if (_loadedPlugins.TryGetValue(pluginId, out var loaded))
        {
            loaded.LoadContext.Unload();
            _loadedPlugins.Remove(pluginId);
            _logger.LogInformation("Unloaded plugin: {PluginId}", pluginId);
        }

        return Task.CompletedTask;
    }

    public IEnumerable<PluginManifest> GetLoadedPlugins()
    {
        return _loadedPlugins.Values.Select(p => p.Manifest);
    }

    private class LoadedPlugin
    {
        public PluginManifest Manifest { get; set; } = null!;
        public IPlugin Plugin { get; set; } = null!;
        public PluginAssemblyLoadContext LoadContext { get; set; } = null!;
        public string Directory { get; set; } = string.Empty;
    }
}

internal class PluginAssemblyLoadContext : AssemblyLoadContext
{
    private readonly AssemblyDependencyResolver _resolver;

    public PluginAssemblyLoadContext(string pluginPath) : base(isCollectible: true)
    {
        _resolver = new AssemblyDependencyResolver(pluginPath);
    }

    protected override Assembly? Load(AssemblyName assemblyName)
    {
        var assemblyPath = _resolver.ResolveAssemblyToPath(assemblyName);
        return assemblyPath != null ? LoadFromAssemblyPath(assemblyPath) : null;
    }

    protected override IntPtr LoadUnmanagedDll(string unmanagedDllName)
    {
        var libraryPath = _resolver.ResolveUnmanagedDllToPath(unmanagedDllName);
        return libraryPath != null ? LoadUnmanagedDllFromPath(libraryPath) : IntPtr.Zero;
    }
}
