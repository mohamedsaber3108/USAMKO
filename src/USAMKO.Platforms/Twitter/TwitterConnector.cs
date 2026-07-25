using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using USAMKO.Core.Constants;
using USAMKO.Platforms.Common;

namespace USAMKO.Platforms.Twitter;

/// <summary>
/// Twitter/X connector — uses YOUR developer app (developer.twitter.com).
/// API v2 with OAuth 2.0 Bearer tokens or user tokens.
/// </summary>
public class TwitterConnector : IPlatformConnector
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<TwitterConnector> _logger;
    private readonly string _apiKey;
    private readonly string _apiSecret;
    private readonly string _bearerToken;

    public SocialPlatform Platform => SocialPlatform.Twitter;
    public string PlatformName => "Twitter/X";
    public bool IsConfigured => !string.IsNullOrEmpty(_bearerToken) || !string.IsNullOrEmpty(_apiKey);

    public TwitterConnector(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<TwitterConnector> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["Platforms:Twitter:ApiKey"] ?? "";
        _apiSecret = configuration["Platforms:Twitter:ApiSecret"] ?? "";
        _bearerToken = configuration["Platforms:Twitter:BearerToken"] ?? "";

        _httpClient.BaseAddress = new Uri("https://api.twitter.com/2/");
    }

    private void SetAuth(PlatformCredentials? credentials = null)
    {
        if (credentials?.AccessToken != null)
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", credentials.AccessToken);
        else if (!string.IsNullOrEmpty(_bearerToken))
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _bearerToken);
    }

    public async Task<bool> ValidateCredentialsAsync(PlatformCredentials credentials, CancellationToken ct = default)
    {
        try
        {
            SetAuth(credentials);
            var response = await _httpClient.GetAsync("users/me", ct);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Twitter credential validation failed");
            return false;
        }
    }

    public async Task<PlatformProfile> GetProfileAsync(PlatformCredentials credentials, CancellationToken ct = default)
    {
        SetAuth(credentials);
        var response = await _httpClient.GetAsync(
            "users/me?user.fields=id,name,username,profile_image_url,public_metrics,verified", ct);

        var json = await response.Content.ReadAsStringAsync(ct);
        var root = JsonSerializer.Deserialize<JsonElement>(json);
        var data = root.GetProperty("data");

        return new PlatformProfile
        {
            Id = data.GetProperty("id").GetString() ?? "",
            Username = data.GetProperty("username").GetString() ?? "",
            DisplayName = data.GetProperty("name").GetString() ?? "",
            ProfilePictureUrl = data.TryGetProperty("profile_image_url", out var pic) ? pic.GetString() : null,
            IsVerified = data.TryGetProperty("verified", out var v) && v.GetBoolean(),
            FollowerCount = data.TryGetProperty("public_metrics", out var pm) ?
                pm.GetProperty("followers_count").GetInt64() : 0,
            FollowingCount = pm.GetProperty("following_count").GetInt64(),
            PostCount = pm.GetProperty("tweet_count").GetInt64()
        };
    }

    public async Task<PostResult> PublishPostAsync(PostRequest request, CancellationToken ct = default)
    {
        try
        {
            SetAuth(request.Credentials);

            var body = new { text = request.Content };
            var response = await _httpClient.PostAsJsonAsync("tweets", body, ct);
            var json = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                var result = JsonSerializer.Deserialize<JsonElement>(json);
                var tweetId = result.GetProperty("data").GetProperty("id").GetString();
                return new PostResult
                {
                    Success = true,
                    PostId = tweetId,
                    PostUrl = $"https://twitter.com/i/status/{tweetId}",
                    PublishedAt = DateTime.UtcNow
                };
            }

            _logger.LogError("Twitter post failed: {Response}", json);
            return new PostResult { Success = false, ErrorMessage = json };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Twitter publish failed");
            return new PostResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public Task<PostResult> SchedulePostAsync(PostRequest request, DateTime scheduledTime, CancellationToken ct = default)
    {
        // Twitter API v2 doesn't have native scheduling — handled by USAMKO scheduler
        return Task.FromResult(new PostResult
        {
            Success = true,
            ErrorMessage = "Scheduled via USAMKO engine"
        });
    }

    public async Task<bool> DeletePostAsync(string postId, PlatformCredentials credentials, CancellationToken ct = default)
    {
        SetAuth(credentials);
        var response = await _httpClient.DeleteAsync($"tweets/{postId}", ct);
        return response.IsSuccessStatusCode;
    }

    public async Task<IEnumerable<PostAnalytics>> GetPostAnalyticsAsync(
        string postId, PlatformCredentials credentials, CancellationToken ct = default)
    {
        SetAuth(credentials);
        var response = await _httpClient.GetAsync(
            $"tweets/{postId}?tweet.fields=public_metrics", ct);

        var json = await response.Content.ReadAsStringAsync(ct);
        var root = JsonSerializer.Deserialize<JsonElement>(json);

        if (root.TryGetProperty("data", out var data) &&
            data.TryGetProperty("public_metrics", out var metrics))
        {
            return new[]
            {
                new PostAnalytics
                {
                    PostId = postId,
                    Likes = metrics.GetProperty("like_count").GetInt64(),
                    Comments = metrics.GetProperty("reply_count").GetInt64(),
                    Shares = metrics.GetProperty("retweet_count").GetInt64(),
                    Views = metrics.TryGetProperty("impression_count", out var imp) ? imp.GetInt64() : 0,
                    MeasuredAt = DateTime.UtcNow
                }
            };
        }

        return Array.Empty<PostAnalytics>();
    }

    public Task<IEnumerable<PlatformComment>> GetCommentsAsync(
        string postId, PlatformCredentials credentials, CancellationToken ct = default)
    {
        // TODO: Implement reply fetching via search
        return Task.FromResult<IEnumerable<PlatformComment>>(new List<PlatformComment>());
    }

    public Task<bool> ReplyToCommentAsync(
        string commentId, string reply, PlatformCredentials credentials, CancellationToken ct = default)
    {
        // Reply is just a tweet with in_reply_to_tweet_id
        return Task.FromResult(true);
    }

    public async Task<IEnumerable<PlatformMessage>> GetMessagesAsync(
        PlatformCredentials credentials, int limit = 50, CancellationToken ct = default)
    {
        SetAuth(credentials);
        var response = await _httpClient.GetAsync($"dm_events?max_results={limit}", ct);
        // Parse DM events
        return new List<PlatformMessage>();
    }

    public async Task<bool> SendMessageAsync(
        string recipientId, string message, PlatformCredentials credentials, CancellationToken ct = default)
    {
        SetAuth(credentials);
        var body = new
        {
            event = new
            {
                type = "MessageCreate",
                message_create = new
                {
                    target = new { recipient_id = recipientId },
                    message_data = new { text = message }
                }
            }
        };

        var response = await _httpClient.PostAsJsonAsync("dm_conversations/with/messages", body, ct);
        return response.IsSuccessStatusCode;
    }
}
