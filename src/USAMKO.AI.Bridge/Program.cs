using Serilog;
using USAMKO.AI.Models;
using USAMKO.AI.Models.Claude;
using USAMKO.AI.Models.Local;
using USAMKO.AI.Models.OpenAI;
using USAMKO.AI.Orchestration;
using USAMKO.Core.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Load USAMKO config
builder.Configuration.AddJsonFile("../../USAMKO.config.json", optional: true, reloadOnChange: true);

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/usamko-ai-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Register AI providers — each uses YOUR API keys
builder.Services.AddHttpClient<OpenAIProvider>();
builder.Services.AddHttpClient<ClaudeProvider>();
builder.Services.AddHttpClient<LocalLLMProvider>();

builder.Services.AddSingleton<IAIProvider, OpenAIProvider>(sp =>
    sp.GetRequiredService<OpenAIProvider>());
builder.Services.AddSingleton<IAIProvider, ClaudeProvider>(sp =>
    sp.GetRequiredService<ClaudeProvider>());
builder.Services.AddSingleton<IAIProvider, LocalLLMProvider>(sp =>
    sp.GetRequiredService<LocalLLMProvider>());

builder.Services.AddSingleton<IAIService, AIOrchestrator>();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

app.UseCors();

// === AI Endpoints — called by the existing app via HTTP ===

app.MapPost("/api/ai/generate", async (GenerateRequest req, IAIService ai) =>
{
    var result = await ai.GenerateContentAsync(
        req.Prompt,
        Enum.Parse<USAMKO.Core.Constants.AIProvider>(req.Provider ?? "OpenAI", true),
        req.Model,
        req.MaxTokens,
        req.Temperature);
    return Results.Ok(new { content = result });
});

app.MapPost("/api/ai/hashtags", async (HashtagRequest req, IAIService ai) =>
{
    var result = await ai.GenerateHashtagsAsync(req.Content, req.Count);
    return Results.Ok(new { hashtags = result });
});

app.MapPost("/api/ai/sentiment", async (SentimentRequest req, IAIService ai) =>
{
    var score = await ai.AnalyzeSentimentAsync(req.Text);
    return Results.Ok(new { score, label = score > 0.3 ? "positive" : score < -0.3 ? "negative" : "neutral" });
});

app.MapPost("/api/ai/translate", async (TranslateRequest req, IAIService ai) =>
{
    var result = await ai.TranslateAsync(req.Text, req.TargetLanguage, req.SourceLanguage);
    return Results.Ok(new { translated = result });
});

app.MapPost("/api/ai/improve", async (ImproveRequest req, IAIService ai) =>
{
    var result = await ai.ImproveTextAsync(req.Text, req.Style);
    return Results.Ok(new { improved = result });
});

app.MapPost("/api/ai/variations", async (VariationsRequest req, IAIService ai) =>
{
    var result = await ai.GenerateVariationsAsync(req.Text, req.Count);
    return Results.Ok(new { variations = result });
});

app.MapPost("/api/ai/keywords", async (KeywordsRequest req, IAIService ai) =>
{
    var result = await ai.ExtractKeywordsAsync(req.Text, req.Count);
    return Results.Ok(new { keywords = result });
});

app.MapPost("/api/ai/image", async (ImageRequest req, IAIService ai) =>
{
    var url = await ai.GenerateImageAsync(req.Prompt, req.Size, req.Quality);
    return Results.Ok(new { imageUrl = url });
});

app.MapGet("/api/ai/health", () => Results.Ok(new
{
    status = "running",
    service = "USAMKO AI Bridge",
    version = "1.0.0"
}));

Log.Information("===================================");
Log.Information("  USAMKO AI Bridge Service v1.0.0");
Log.Information("  Listening on: http://localhost:5100");
Log.Information("  Health: /api/ai/health");
Log.Information("===================================");

app.Run("http://localhost:5100");

// Request DTOs
record GenerateRequest(string Prompt, string? Provider = "OpenAI", string? Model = null, int? MaxTokens = null, double? Temperature = null);
record HashtagRequest(string Content, int Count = 10);
record SentimentRequest(string Text);
record TranslateRequest(string Text, string TargetLanguage, string? SourceLanguage = null);
record ImproveRequest(string Text, string? Style = null);
record VariationsRequest(string Text, int Count = 3);
record KeywordsRequest(string Text, int Count = 10);
record ImageRequest(string Prompt, string? Size = "1024x1024", string? Quality = "standard");
