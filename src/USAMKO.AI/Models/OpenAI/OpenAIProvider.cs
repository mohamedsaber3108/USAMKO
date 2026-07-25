using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using USAMKO.AI.Models;
using USAMKO.Core.Constants;

namespace USAMKO.AI.Models.OpenAI;

/// <summary>
/// OpenAI provider — uses YOUR API key, billed to YOUR account.
/// Models: gpt-4o, gpt-4-turbo, gpt-3.5-turbo, dall-e-3
/// </summary>
public class OpenAIProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OpenAIProvider> _logger;
    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly string _defaultModel;
    private readonly int _defaultMaxTokens;
    private readonly double _defaultTemperature;

    public AIProvider ProviderType => AIProvider.OpenAI;
    public string Name => "OpenAI";
    public bool IsEnabled { get; }

    public OpenAIProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<OpenAIProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        _apiKey = configuration["AI:Providers:OpenAI:ApiKey"] ?? "";
        _baseUrl = configuration["AI:Providers:OpenAI:BaseUrl"] ?? "https://api.openai.com/v1";
        _defaultModel = configuration["AI:Providers:OpenAI:DefaultModel"] ?? "gpt-4o";
        _defaultMaxTokens = int.Parse(configuration["AI:Providers:OpenAI:MaxTokens"] ?? "4096");
        _defaultTemperature = double.Parse(configuration["AI:Providers:OpenAI:Temperature"] ?? "0.7");
        IsEnabled = bool.Parse(configuration["AI:Providers:OpenAI:Enabled"] ?? "true");

        _httpClient.BaseAddress = new Uri(_baseUrl);
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
    }

    public async Task<AIResponse> GenerateAsync(AIRequest request, CancellationToken cancellationToken = default)
    {
        var startTime = DateTime.UtcNow;

        try
        {
            var messages = new List<object>();

            if (!string.IsNullOrEmpty(request.SystemMessage))
            {
                messages.Add(new { role = "system", content = request.SystemMessage });
            }

            messages.Add(new { role = "user", content = request.Prompt });

            var body = new
            {
                model = request.Model ?? _defaultModel,
                messages,
                max_tokens = request.MaxTokens ?? _defaultMaxTokens,
                temperature = request.Temperature ?? _defaultTemperature,
                top_p = request.TopP ?? 1.0,
                frequency_penalty = request.FrequencyPenalty ?? 0.0,
                presence_penalty = request.PresencePenalty ?? 0.0
            };

            var response = await _httpClient.PostAsJsonAsync("/v1/chat/completions", body, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("OpenAI API error: {StatusCode} - {Response}", response.StatusCode, json);
                return new AIResponse
                {
                    Success = false,
                    ErrorMessage = $"OpenAI API error: {response.StatusCode}",
                    Provider = AIProvider.OpenAI,
                    Duration = DateTime.UtcNow - startTime
                };
            }

            var result = JsonSerializer.Deserialize<OpenAIChatResponse>(json);

            return new AIResponse
            {
                Content = result?.Choices?.FirstOrDefault()?.Message?.Content ?? "",
                Model = result?.Model ?? _defaultModel,
                Provider = AIProvider.OpenAI,
                PromptTokens = result?.Usage?.PromptTokens ?? 0,
                CompletionTokens = result?.Usage?.CompletionTokens ?? 0,
                TotalTokens = result?.Usage?.TotalTokens ?? 0,
                Duration = DateTime.UtcNow - startTime,
                Success = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OpenAI generation failed");
            return new AIResponse
            {
                Success = false,
                ErrorMessage = ex.Message,
                Provider = AIProvider.OpenAI,
                Duration = DateTime.UtcNow - startTime
            };
        }
    }

    public async Task<ImageGenerationResponse> GenerateImageAsync(
        ImageGenerationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var body = new
            {
                model = "dall-e-3",
                prompt = request.Prompt,
                n = request.Count,
                size = request.Size,
                quality = request.Quality,
                style = request.Style ?? "vivid"
            };

            var response = await _httpClient.PostAsJsonAsync("/v1/images/generations", body, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return new ImageGenerationResponse
                {
                    Success = false,
                    ErrorMessage = $"DALL-E API error: {response.StatusCode}"
                };
            }

            var result = JsonSerializer.Deserialize<OpenAIImageResponse>(json);

            return new ImageGenerationResponse
            {
                ImageUrls = result?.Data?.Select(d => d.Url ?? "").ToList() ?? new(),
                Success = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DALL-E image generation failed");
            return new ImageGenerationResponse
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }
}

// JSON response models
internal class OpenAIChatResponse
{
    [JsonPropertyName("id")] public string? Id { get; set; }
    [JsonPropertyName("model")] public string? Model { get; set; }
    [JsonPropertyName("choices")] public List<OpenAIChoice>? Choices { get; set; }
    [JsonPropertyName("usage")] public OpenAIUsage? Usage { get; set; }
}

internal class OpenAIChoice
{
    [JsonPropertyName("message")] public OpenAIMessage? Message { get; set; }
    [JsonPropertyName("finish_reason")] public string? FinishReason { get; set; }
}

internal class OpenAIMessage
{
    [JsonPropertyName("role")] public string? Role { get; set; }
    [JsonPropertyName("content")] public string? Content { get; set; }
}

internal class OpenAIUsage
{
    [JsonPropertyName("prompt_tokens")] public int PromptTokens { get; set; }
    [JsonPropertyName("completion_tokens")] public int CompletionTokens { get; set; }
    [JsonPropertyName("total_tokens")] public int TotalTokens { get; set; }
}

internal class OpenAIImageResponse
{
    [JsonPropertyName("data")] public List<OpenAIImageData>? Data { get; set; }
}

internal class OpenAIImageData
{
    [JsonPropertyName("url")] public string? Url { get; set; }
    [JsonPropertyName("revised_prompt")] public string? RevisedPrompt { get; set; }
}
