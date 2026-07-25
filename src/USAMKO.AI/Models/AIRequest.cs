using USAMKO.Core.Constants;

namespace USAMKO.AI.Models;

public class AIRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string? SystemMessage { get; set; }
    public AIProvider Provider { get; set; } = AIProvider.OpenAI;
    public string? Model { get; set; }
    public int? MaxTokens { get; set; }
    public double? Temperature { get; set; }
    public double? TopP { get; set; }
    public double? FrequencyPenalty { get; set; }
    public double? PresencePenalty { get; set; }
}

public class AIResponse
{
    public string Content { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public AIProvider Provider { get; set; }
    public int PromptTokens { get; set; }
    public int CompletionTokens { get; set; }
    public int TotalTokens { get; set; }
    public TimeSpan Duration { get; set; }
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}

public class ImageGenerationRequest
{
    public string Prompt { get; set; } = string.Empty;
    public string Size { get; set; } = "1024x1024";
    public string Quality { get; set; } = "standard";
    public int Count { get; set; } = 1;
    public string? Style { get; set; }
}

public class ImageGenerationResponse
{
    public List<string> ImageUrls { get; set; } = new();
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
}
