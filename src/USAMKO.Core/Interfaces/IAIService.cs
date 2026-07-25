using USAMKO.Core.Constants;

namespace USAMKO.Core.Interfaces;

/// <summary>
/// AI service interface for content generation and analysis
/// </summary>
public interface IAIService
{
    /// <summary>
    /// Generate text content using AI
    /// </summary>
    Task<string> GenerateContentAsync(
        string prompt,
        AIProvider provider = AIProvider.OpenAI,
        string? model = null,
        int? maxTokens = null,
        double? temperature = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate image using AI
    /// </summary>
    Task<string> GenerateImageAsync(
        string prompt,
        string? size = null,
        string? quality = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Analyze sentiment of text
    /// </summary>
    Task<double> AnalyzeSentimentAsync(
        string text,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate hashtags for content
    /// </summary>
    Task<IEnumerable<string>> GenerateHashtagsAsync(
        string content,
        int count = 10,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Translate text to target language
    /// </summary>
    Task<string> TranslateAsync(
        string text,
        string targetLanguage,
        string? sourceLanguage = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Improve/rewrite text
    /// </summary>
    Task<string> ImproveTextAsync(
        string text,
        string? style = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate content variations
    /// </summary>
    Task<IEnumerable<string>> GenerateVariationsAsync(
        string text,
        int count = 3,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Extract keywords from text
    /// </summary>
    Task<IEnumerable<string>> ExtractKeywordsAsync(
        string text,
        int count = 10,
        CancellationToken cancellationToken = default);
}
