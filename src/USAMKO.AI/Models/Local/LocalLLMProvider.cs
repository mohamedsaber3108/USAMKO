using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using USAMKO.AI.Models;
using USAMKO.Core.Constants;

namespace USAMKO.AI.Models.Local;

/// <summary>
/// Local LLM provider (Ollama/LM Studio) — runs on YOUR hardware.
/// No cloud dependency. Complete privacy. Zero cost per request.
/// </summary>
public class LocalLLMProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<LocalLLMProvider> _logger;
    private readonly string _defaultModel;

    public AIProvider ProviderType => AIProvider.Local;
    public string Name => "Local LLM (Ollama)";
    public bool IsEnabled { get; }

    public LocalLLMProvider(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<LocalLLMProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        var baseUrl = configuration["AI:Providers:Local:BaseUrl"] ?? "http://localhost:11434";
        _defaultModel = configuration["AI:Providers:Local:DefaultModel"] ?? "llama3";
        IsEnabled = bool.Parse(configuration["AI:Providers:Local:Enabled"] ?? "false");

        _httpClient.BaseAddress = new Uri(baseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(
            int.Parse(configuration["AI:Providers:Local:Timeout"] ?? "300"));
    }

    public async Task<AIResponse> GenerateAsync(AIRequest request, CancellationToken cancellationToken = default)
    {
        var startTime = DateTime.UtcNow;

        try
        {
            var body = new
            {
                model = request.Model ?? _defaultModel,
                prompt = request.Prompt,
                system = request.SystemMessage ?? "You are USAMKO AI assistant.",
                stream = false,
                options = new
                {
                    temperature = request.Temperature ?? 0.7,
                    num_predict = request.MaxTokens ?? 4096,
                    top_p = request.TopP ?? 0.9
                }
            };

            var response = await _httpClient.PostAsJsonAsync("/api/generate", body, cancellationToken);
            var json = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Local LLM error: {StatusCode} - {Response}", response.StatusCode, json);
                return new AIResponse
                {
                    Success = false,
                    ErrorMessage = $"Local LLM error: {response.StatusCode}. Is Ollama running?",
                    Provider = AIProvider.Local,
                    Duration = DateTime.UtcNow - startTime
                };
            }

            var result = JsonSerializer.Deserialize<OllamaResponse>(json);

            return new AIResponse
            {
                Content = result?.Response ?? "",
                Model = result?.Model ?? _defaultModel,
                Provider = AIProvider.Local,
                PromptTokens = result?.PromptEvalCount ?? 0,
                CompletionTokens = result?.EvalCount ?? 0,
                TotalTokens = (result?.PromptEvalCount ?? 0) + (result?.EvalCount ?? 0),
                Duration = DateTime.UtcNow - startTime,
                Success = true
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Cannot connect to local LLM. Is Ollama running?");
            return new AIResponse
            {
                Success = false,
                ErrorMessage = "Cannot connect to local LLM. Ensure Ollama is running on " +
                              _httpClient.BaseAddress,
                Provider = AIProvider.Local,
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
            ErrorMessage = "Local LLM does not support image generation. Use OpenAI DALL-E instead."
        });
    }
}

internal class OllamaResponse
{
    [JsonPropertyName("model")] public string? Model { get; set; }
    [JsonPropertyName("response")] public string? Response { get; set; }
    [JsonPropertyName("done")] public bool Done { get; set; }
    [JsonPropertyName("prompt_eval_count")] public int PromptEvalCount { get; set; }
    [JsonPropertyName("eval_count")] public int EvalCount { get; set; }
}
