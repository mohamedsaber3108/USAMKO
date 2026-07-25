using System.Net.Http.Json;
using System.Text.Json;

namespace USAMKO.AI.Bridge;

/// <summary>
/// Lightweight client for calling the USAMKO AI Bridge from the existing app.
///
/// Usage from the existing codebase (add reference or copy this file):
///
///   var ai = new UsamkoAIClient(); // defaults to http://localhost:5100
///
///   // Generate content
///   string post = await ai.GenerateAsync("Write a motivational post about success");
///
///   // Get hashtags
///   string[] tags = await ai.GetHashtagsAsync("My amazing product launch today!");
///
///   // Translate
///   string arabic = await ai.TranslateAsync("Hello world", "Arabic");
///
///   // Improve text
///   string better = await ai.ImproveAsync("this is my post its good");
///
///   // Analyze sentiment
///   double score = await ai.GetSentimentAsync("I love this product!");
///
///   // Generate image
///   string imageUrl = await ai.GenerateImageAsync("A beautiful sunset over the ocean");
///
/// The AI service must be running (Start-USAMKO.bat starts it automatically).
/// If the service is not running, all methods return graceful defaults (empty string, 0.0, etc.)
/// so the existing app continues working without AI.
/// </summary>
public class UsamkoAIClient : IDisposable
{
    private readonly HttpClient _http;
    private readonly string _baseUrl;

    public UsamkoAIClient(string baseUrl = "http://localhost:5100")
    {
        _baseUrl = baseUrl;
        _http = new HttpClient { BaseAddress = new Uri(baseUrl), Timeout = TimeSpan.FromSeconds(30) };
    }

    /// <summary>
    /// Check if AI service is available
    /// </summary>
    public async Task<bool> IsAvailableAsync()
    {
        try
        {
            var response = await _http.GetAsync("/api/ai/health");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Generate content using AI
    /// </summary>
    public async Task<string> GenerateAsync(string prompt, string? provider = null, string? model = null)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/generate", new
            {
                prompt,
                provider = provider ?? "OpenAI",
                model
            });

            if (!response.IsSuccessStatusCode) return "";

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            return result.GetProperty("content").GetString() ?? "";
        }
        catch
        {
            return "";
        }
    }

    /// <summary>
    /// Generate hashtags for content
    /// </summary>
    public async Task<string[]> GetHashtagsAsync(string content, int count = 10)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/hashtags", new { content, count });
            if (!response.IsSuccessStatusCode) return Array.Empty<string>();

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            return result.GetProperty("hashtags").EnumerateArray()
                .Select(h => h.GetString() ?? "").ToArray();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    /// <summary>
    /// Analyze sentiment (-1.0 to 1.0)
    /// </summary>
    public async Task<double> GetSentimentAsync(string text)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/sentiment", new { text });
            if (!response.IsSuccessStatusCode) return 0.0;

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            return result.GetProperty("score").GetDouble();
        }
        catch
        {
            return 0.0;
        }
    }

    /// <summary>
    /// Translate text to target language
    /// </summary>
    public async Task<string> TranslateAsync(string text, string targetLanguage, string? sourceLanguage = null)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/translate", new
            {
                text,
                targetLanguage,
                sourceLanguage
            });

            if (!response.IsSuccessStatusCode) return text;

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            return result.GetProperty("translated").GetString() ?? text;
        }
        catch
        {
            return text;
        }
    }

    /// <summary>
    /// Improve/rewrite text for social media
    /// </summary>
    public async Task<string> ImproveAsync(string text, string? style = null)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/improve", new { text, style });
            if (!response.IsSuccessStatusCode) return text;

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            return result.GetProperty("improved").GetString() ?? text;
        }
        catch
        {
            return text;
        }
    }

    /// <summary>
    /// Generate variations of a post
    /// </summary>
    public async Task<string[]> GetVariationsAsync(string text, int count = 3)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/variations", new { text, count });
            if (!response.IsSuccessStatusCode) return new[] { text };

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            return result.GetProperty("variations").EnumerateArray()
                .Select(v => v.GetString() ?? "").ToArray();
        }
        catch
        {
            return new[] { text };
        }
    }

    /// <summary>
    /// Extract keywords from text
    /// </summary>
    public async Task<string[]> ExtractKeywordsAsync(string text, int count = 10)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/keywords", new { text, count });
            if (!response.IsSuccessStatusCode) return Array.Empty<string>();

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            return result.GetProperty("keywords").EnumerateArray()
                .Select(k => k.GetString() ?? "").ToArray();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    /// <summary>
    /// Generate an image from text prompt (returns URL)
    /// </summary>
    public async Task<string> GenerateImageAsync(string prompt, string? size = null)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/api/ai/image", new
            {
                prompt,
                size = size ?? "1024x1024"
            });

            if (!response.IsSuccessStatusCode) return "";

            var result = await response.Content.ReadFromJsonAsync<JsonElement>();
            return result.GetProperty("imageUrl").GetString() ?? "";
        }
        catch
        {
            return "";
        }
    }

    public void Dispose() => _http.Dispose();
}
