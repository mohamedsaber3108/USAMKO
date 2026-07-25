using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Playwright;

namespace USAMKO.Automation.Browser;

/// <summary>
/// Browser automation engine using Playwright and Selenium.
/// Runs browsers on YOUR machine — full control over browser profiles,
/// cookies, proxies, user agents, and automation scripts.
/// </summary>
public interface IBrowserAutomationEngine
{
    Task<IBrowserContext> CreateBrowserContextAsync(BrowserProfile profile, CancellationToken ct = default);
    Task<string> NavigateAndExtractAsync(string url, string selector, BrowserProfile? profile = null, CancellationToken ct = default);
    Task ExecuteScriptAsync(string url, string script, BrowserProfile? profile = null, CancellationToken ct = default);
    Task<byte[]> TakeScreenshotAsync(string url, BrowserProfile? profile = null, CancellationToken ct = default);
    Task CloseBrowserAsync(string profileId);
}

public class BrowserAutomationEngine : IBrowserAutomationEngine, IAsyncDisposable
{
    private readonly ILogger<BrowserAutomationEngine> _logger;
    private readonly IConfiguration _configuration;
    private IPlaywright? _playwright;
    private IBrowser? _browser;
    private readonly Dictionary<string, IBrowserContext> _contexts = new();
    private readonly SemaphoreSlim _lock = new(1, 1);

    public BrowserAutomationEngine(
        ILogger<BrowserAutomationEngine> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    private async Task EnsureInitializedAsync()
    {
        if (_playwright != null) return;

        await _lock.WaitAsync();
        try
        {
            if (_playwright != null) return;

            _playwright = await Playwright.CreateAsync();
            _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
            {
                Headless = bool.Parse(_configuration["Automation:Browser:Headless"] ?? "true"),
                SlowMo = float.Parse(_configuration["Automation:Browser:SlowMo"] ?? "0"),
            });

            _logger.LogInformation("Browser automation engine initialized");
        }
        finally
        {
            _lock.Release();
        }
    }

    public async Task<IBrowserContext> CreateBrowserContextAsync(BrowserProfile profile, CancellationToken ct = default)
    {
        await EnsureInitializedAsync();

        var options = new BrowserNewContextOptions
        {
            UserAgent = profile.UserAgent,
            ViewportSize = new ViewportSize
            {
                Width = profile.ViewportWidth,
                Height = profile.ViewportHeight
            },
            Locale = profile.Locale ?? "en-US",
            TimezoneId = profile.Timezone ?? "America/New_York",
        };

        if (!string.IsNullOrEmpty(profile.ProxyServer))
        {
            options.Proxy = new Proxy
            {
                Server = profile.ProxyServer,
                Username = profile.ProxyUsername,
                Password = profile.ProxyPassword
            };
        }

        var context = await _browser!.NewContextAsync(options);

        // Load cookies if available
        if (profile.Cookies != null && profile.Cookies.Count > 0)
        {
            await context.AddCookiesAsync(profile.Cookies.Select(c => new Cookie
            {
                Name = c.Name,
                Value = c.Value,
                Domain = c.Domain,
                Path = c.Path ?? "/",
                Secure = c.Secure,
                HttpOnly = c.HttpOnly
            }).ToList());
        }

        _contexts[profile.Id] = context;
        return context;
    }

    public async Task<string> NavigateAndExtractAsync(
        string url, string selector, BrowserProfile? profile = null, CancellationToken ct = default)
    {
        await EnsureInitializedAsync();

        var context = profile != null
            ? await GetOrCreateContext(profile)
            : await _browser!.NewContextAsync();

        var page = await context.NewPageAsync();

        try
        {
            await page.GotoAsync(url, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
            var element = await page.QuerySelectorAsync(selector);
            return element != null ? await element.InnerTextAsync() : "";
        }
        finally
        {
            await page.CloseAsync();
            if (profile == null) await context.CloseAsync();
        }
    }

    public async Task ExecuteScriptAsync(
        string url, string script, BrowserProfile? profile = null, CancellationToken ct = default)
    {
        await EnsureInitializedAsync();

        var context = profile != null
            ? await GetOrCreateContext(profile)
            : await _browser!.NewContextAsync();

        var page = await context.NewPageAsync();

        try
        {
            await page.GotoAsync(url, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
            await page.EvaluateAsync(script);
        }
        finally
        {
            await page.CloseAsync();
            if (profile == null) await context.CloseAsync();
        }
    }

    public async Task<byte[]> TakeScreenshotAsync(
        string url, BrowserProfile? profile = null, CancellationToken ct = default)
    {
        await EnsureInitializedAsync();

        var context = profile != null
            ? await GetOrCreateContext(profile)
            : await _browser!.NewContextAsync();

        var page = await context.NewPageAsync();

        try
        {
            await page.GotoAsync(url, new PageGotoOptions { WaitUntil = WaitUntilState.NetworkIdle });
            return await page.ScreenshotAsync(new PageScreenshotOptions { FullPage = true });
        }
        finally
        {
            await page.CloseAsync();
            if (profile == null) await context.CloseAsync();
        }
    }

    public async Task CloseBrowserAsync(string profileId)
    {
        if (_contexts.TryGetValue(profileId, out var context))
        {
            await context.CloseAsync();
            _contexts.Remove(profileId);
        }
    }

    private async Task<IBrowserContext> GetOrCreateContext(BrowserProfile profile)
    {
        if (_contexts.TryGetValue(profile.Id, out var existing))
            return existing;

        return await CreateBrowserContextAsync(profile);
    }

    public async ValueTask DisposeAsync()
    {
        foreach (var context in _contexts.Values)
            await context.CloseAsync();
        _contexts.Clear();

        if (_browser != null) await _browser.CloseAsync();
        _playwright?.Dispose();
    }
}

/// <summary>
/// Browser profile — YOUR profiles, YOUR cookies, YOUR proxies.
/// </summary>
public class BrowserProfile
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = "Default";
    public string? UserAgent { get; set; }
    public int ViewportWidth { get; set; } = 1920;
    public int ViewportHeight { get; set; } = 1080;
    public string? Locale { get; set; }
    public string? Timezone { get; set; }
    public string? ProxyServer { get; set; }
    public string? ProxyUsername { get; set; }
    public string? ProxyPassword { get; set; }
    public List<BrowserCookie> Cookies { get; set; } = new();
    public Dictionary<string, string> ExtraHeaders { get; set; } = new();
}

public class BrowserCookie
{
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string? Path { get; set; }
    public bool Secure { get; set; }
    public bool HttpOnly { get; set; }
}
