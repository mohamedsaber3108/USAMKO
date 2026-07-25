using USAMKO.Core.Constants;

namespace USAMKO.AI.Models;

/// <summary>
/// Base interface for all AI providers.
/// You control which providers are active and which API keys are used.
/// </summary>
public interface IAIProvider
{
    AIProvider ProviderType { get; }
    string Name { get; }
    bool IsEnabled { get; }

    Task<AIResponse> GenerateAsync(AIRequest request, CancellationToken cancellationToken = default);
    Task<ImageGenerationResponse> GenerateImageAsync(ImageGenerationRequest request, CancellationToken cancellationToken = default);
}
