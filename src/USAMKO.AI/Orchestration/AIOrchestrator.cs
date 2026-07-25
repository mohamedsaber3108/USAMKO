using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using USAMKO.AI.Models;
using USAMKO.Core.Constants;
using USAMKO.Core.Interfaces;

namespace USAMKO.AI.Orchestration;

/// <summary>
/// AI Orchestrator — routes requests to the right provider based on YOUR configuration.
/// Implements IAIService from Core so the rest of the app doesn't care which provider is active.
/// Failover: if primary fails, tries next enabled provider automatically.
/// </summary>
public class AIOrchestrator : IAIService
{
    private readonly Dictionary<AIProvider, IAIProvider> _providers;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AIOrchestrator> _logger;
    private readonly AIProvider _defaultProvider;

    public AIOrchestrator(
        IEnumerable<IAIProvider> providers,
        IConfiguration configuration,
        ILogger<AIOrchestrator> logger)
    {
        _providers = providers
            .Where(p => p.IsEnabled)
            .ToDictionary(p => p.ProviderType);
        _configuration = configuration;
        _logger = logger;

        var defaultProviderStr = configuration["AI:DefaultProvider"] ?? "OpenAI";
        _defaultProvider = Enum.Parse<AIProvider>(defaultProviderStr);
    }

    public async Task<string> GenerateContentAsync(
        string prompt,
        AIProvider provider = AIProvider.OpenAI,
        string? model = null,
        int? maxTokens = null,
        double? temperature = null,
        CancellationToken cancellationToken = default)
    {
        var request = new AIRequest
        {
            Prompt = prompt,
            Provider = provider,
            Model = model,
            MaxTokens = maxTokens,
            Temperature = temperature
        };

        var response = await ExecuteWithFailover(request, cancellationToken);
        return response.Content;
    }

    public async Task<string> GenerateImageAsync(
        string prompt,
        string? size = null,
        string? quality = null,
        CancellationToken cancellationToken = default)
    {
        var request = new ImageGenerationRequest
        {
            Prompt = prompt,
            Size = size ?? "1024x1024",
            Quality = quality ?? "standard"
        };

        // Image generation only available via OpenAI
        if (_providers.TryGetValue(AIProvider.OpenAI, out var openai))
        {
            var response = await openai.GenerateImageAsync(request, cancellationToken);
            if (response.Success)
                return response.ImageUrls.FirstOrDefault() ?? "";

            _logger.LogError("Image generation failed: {Error}", response.ErrorMessage);
        }

        return "";
    }

    public async Task<double> AnalyzeSentimentAsync(string text, CancellationToken cancellationToken = default)
    {
        var prompt = $"Analyze the sentiment of the following text and respond with ONLY a number between -1.0 (very negative) and 1.0 (very positive). Text: \"{text}\"";

        var response = await GenerateContentAsync(prompt, _defaultProvider, cancellationToken: cancellationToken);

        if (double.TryParse(response.Trim(), out var score))
            return Math.Clamp(score, -1.0, 1.0);

        return 0.0;
    }

    public async Task<IEnumerable<string>> GenerateHashtagsAsync(
        string content,
        int count = 10,
        CancellationToken cancellationToken = default)
    {
        var prompt = $"Generate {count} relevant hashtags for this social media post. Return ONLY the hashtags separated by spaces, each starting with #. Content: \"{content}\"";

        var response = await GenerateContentAsync(prompt, _defaultProvider, cancellationToken: cancellationToken);

        return response.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(h => h.StartsWith('#'))
            .Take(count);
    }

    public async Task<string> TranslateAsync(
        string text,
        string targetLanguage,
        string? sourceLanguage = null,
        CancellationToken cancellationToken = default)
    {
        var fromLang = sourceLanguage != null ? $" from {sourceLanguage}" : "";
        var prompt = $"Translate the following text{fromLang} to {targetLanguage}. Return ONLY the translation, nothing else. Text: \"{text}\"";

        return await GenerateContentAsync(prompt, _defaultProvider, cancellationToken: cancellationToken);
    }

    public async Task<string> ImproveTextAsync(
        string text,
        string? style = null,
        CancellationToken cancellationToken = default)
    {
        var styleInstruction = style != null ? $" Make it {style}." : "";
        var prompt = $"Improve and rewrite the following text to make it more engaging for social media.{styleInstruction} Return ONLY the improved text. Original: \"{text}\"";

        return await GenerateContentAsync(prompt, _defaultProvider, cancellationToken: cancellationToken);
    }

    public async Task<IEnumerable<string>> GenerateVariationsAsync(
        string text,
        int count = 3,
        CancellationToken cancellationToken = default)
    {
        var prompt = $"Create {count} different variations of this social media post. Each variation should convey the same message but with different wording and style. Separate each variation with '---'. Original: \"{text}\"";

        var response = await GenerateContentAsync(prompt, _defaultProvider, cancellationToken: cancellationToken);

        return response.Split("---", StringSplitOptions.RemoveEmptyEntries)
            .Select(v => v.Trim())
            .Where(v => !string.IsNullOrEmpty(v))
            .Take(count);
    }

    public async Task<IEnumerable<string>> ExtractKeywordsAsync(
        string text,
        int count = 10,
        CancellationToken cancellationToken = default)
    {
        var prompt = $"Extract the {count} most important keywords from this text. Return ONLY the keywords separated by commas. Text: \"{text}\"";

        var response = await GenerateContentAsync(prompt, _defaultProvider, cancellationToken: cancellationToken);

        return response.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(k => k.Trim())
            .Take(count);
    }

    private async Task<AIResponse> ExecuteWithFailover(AIRequest request, CancellationToken cancellationToken)
    {
        var providerOrder = GetProviderOrder(request.Provider);

        foreach (var providerType in providerOrder)
        {
            if (!_providers.TryGetValue(providerType, out var provider))
                continue;

            _logger.LogDebug("Trying AI provider: {Provider}", provider.Name);

            var response = await provider.GenerateAsync(request, cancellationToken);
            if (response.Success)
                return response;

            _logger.LogWarning("Provider {Provider} failed: {Error}. Trying next...",
                provider.Name, response.ErrorMessage);
        }

        _logger.LogError("All AI providers failed for request");
        return new AIResponse
        {
            Success = false,
            ErrorMessage = "All configured AI providers failed. Check your API keys and connectivity."
        };
    }

    private List<AIProvider> GetProviderOrder(AIProvider preferred)
    {
        var order = new List<AIProvider> { preferred };

        foreach (var provider in _providers.Keys)
        {
            if (!order.Contains(provider))
                order.Add(provider);
        }

        return order;
    }
}
