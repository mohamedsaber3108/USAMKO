using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using USAMKO.AI.Models;
using USAMKO.Core.Constants;

namespace USAMKO.AI.Models.Claude;

/// <summary>
/// Anthropic Claude provider — uses YOUR API key from console.anthropic.com
/// Models: claude-3-5-sonnet, claude-3-opus, claude-3-haiku
/// </summary>
public class ClaudeProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ClaudeProvider> _logger;
    private readonly string _apiKey;
    private readonly string _defaultModel;
    private readonly int _defaultMaxTokens;
    private readonly double _defaultTemperature;

    public AIProvider ProviderType => AIProvider.Claude;
    public string Name => "Claude (Anthropic)";
    public bool IsEnabled { get; }

    public ClaudeProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ClaudeProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _apiKey = configuration["AI:Providers:Claude:ApiKey"] ?? "";
        var baseUrl = configuration["AI:Providers:Claude:BaseUrl"] ?? "https://api.anthropic.com";
        _defaultModel = configuration["AI:Providers:Claude:DefaultModel"] ?? "claude-3-5-sonnet-20241022";
        _defaultMaxTokens = int.Parse(configuration["AI:Providers:Claude:MaxTokens"] ?? "4096");
        _defaultTemperature = double.Parse(configuration["AI:Providers:Claude:Temperature"] ?? "0.7");
        IsEnabled = bool.Parse(configuration["AI:Providers:Claude:Enabled"] ?? "true");

        _httpClient.BaseAddress = new Uri(baseUrl);
        _httpClient.DefaultRequestHeaders.Add("x-api-key", _apiKey);
        _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    }

    public async Task<AIResponse> GenerateAsync(AIRequest request, CancellationToken cancellationToken = default)
    {
        var startTime = DateTime.UtcNow;

        try
        {
            var body = new
            {
                model = request.Model ?? _defaultModel,
                max_tokens = request.MaxTokens ?? _defaultMaxTokens,
                temperature = request.Temperature ?? _defaultTemperature,
                system = request.SystemMessage ?? "You are USAMKO AI assistant, helping with social media content creation and automation.",
                messages = new[]
                {
                    new { role = "user", content = request.Prompt }
                }
            };

            var response = await _httpClient.PostAsJsonAsync("/v1/messages", body, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Claude API error: {StatusCode} - {Response}", response.StatusCode, json);
                return new AIResponse
                {
                    Success = false,
                    ErrorMessage = $"Claude API error: {response.StatusCode}",
                    Provider = AIProvider.Claude,
                    Duration = DateTime.UtcNow - startTime
                };
            }

            var result = JsonSerializer.Deserialize<ClaudeResponse>(json);

            var content = result?.Content?.FirstOrDefault(c => c.Type == "text")?.Text ?? "";

            return new AIResponse
            {
                Content = content,
                Model = result?.Model ?? _defaultModel,
                Provider = AIProvider.Claude,
                PromptTokens = result?.Usage?.InputTokens ?? 0,
                CompletionTokens = result?.Usage?.OutputTokens ?? 0,
                TotalTokens = (result?.Usage?.InputTokens ?? 0) + (result?.Usage?.OutputTokens ?? 0),
                Duration = DateTime.UtcNow - startTime,
                Success = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude generation failed");
            return new AIResponse
            {
                Success = false,
                ErrorMessage = ex.Message,
                Provider = AIProvider.Claude,
                Duration = DateTime.UtcNow - startTime
            };
        }
    }

    public Task<ImageGenerationResponse> GenerateImageAsync(
        ImageGenerationRequest request,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new ImageGenerationResponse
        {
            Success = false,
            ErrorMessage = "Claude does not support image generation. Use OpenAI DALL-E instead."
        });
    }
}

// JSON response models
internal class ClaudeResponse
{
    [JsonPropertyName("id")] public string? Id { get; set; }
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("role")] public string? Role { get; set; }
    [JsonPropertyName("model")] public string? Model { get; set; }
    [JsonPropertyName("content")] public List<ClaudeContentBlock>? Content { get; set; }
    [JsonPropertyName("stop_reason")] public string? StopReason { get; set; }
    [JsonPropertyName("usage")] public ClaudeUsage? Usage { get; set; }
}

internal class ClaudeContentBlock
{
    [JsonPropertyName("type")] public string? Type { get; set; }
    [JsonPropertyName("text")] public string? Text { get; set; }
}

internal class ClaudeUsage
{
    [JsonPropertyName("input_tokens")] public int InputTokens { get; set; }
    [JsonPropertyName("output_tokens")] public int OutputTokens { get; set; }
}
