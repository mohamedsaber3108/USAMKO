using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using USAMKO.Core.Constants;
using USAMKO.Platforms.Common;

namespace USAMKO.Platforms.Facebook;

/// <summary>
/// Facebook/Meta integration — uses YOUR Facebook App (developers.facebook.com).
/// You register the app, you own the keys, you control the permissions.
/// </summary>
public class FacebookConnector : IPlatformConnector
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<FacebookConnector> _logger;
    private readonly string _appId;
    private readonly string _appSecret;
    private readonly string _graphApiVersion;

    public SocialPlatform Platform => SocialPlatform.Facebook;
    public string PlatformName => "Facebook";
    public bool IsConfigured => !string.IsNullOrEmpty(_appId);

    public FacebookConnector(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<FacebookConnector> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _appId = configuration["Platforms:Facebook:AppId"] ?? "";
        _appSecret = configuration["Platforms:Facebook:AppSecret"] ?? "";
        _graphApiVersion = configuration["Platforms:Facebook:GraphApiVersion"] ?? "v19.0";

        _httpClient.BaseAddress = new Uri($"https://graph.facebook.com/{_graphApiVersion}/");
    }

    public async Task<bool> ValidateCredentialsAsync(PlatformCredentials credentials, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"me?access_token={credentials.AccessToken}&fields=id,name", ct);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Facebook credential validation failed");
            return false;
        }
    }

    public async Task<PlatformProfile> GetProfileAsync(PlatformCredentials credentials, CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync(
            $"me?access_token={credentials.AccessToken}&fields=id,name,picture,followers_count,friends_count", ct);

        var json = await response.Content.ReadAsStringAsync(ct);
        var data = JsonSerializer.Deserialize<JsonElement>(json);

        return new PlatformProfile
        {
            Id = data.GetProperty("id").GetString() ?? "",
            DisplayName = data.GetProperty("name").GetString() ?? "",
            Username = data.GetProperty("id").GetString() ?? "",
            FollowerCount = data.TryGetProperty("followers_count", out var fc) ? fc.GetInt64() : 0,
        };
    }

    public async Task<PostResult> PublishPostAsync(PostRequest request, CancellationToken ct = default)
    {
        try
        {
            var pageId = request.Credentials.AccountId;
            var endpoint = $"{pageId}/feed";

            var formData = new Dictionary<string, string>
            {
                ["message"] = request.Content,
                ["access_token"] = request.Credentials.AccessToken ?? ""
            };

            if (!string.IsNullOrEmpty(request.LinkUrl))
                formData["link"] = request.LinkUrl;

            var content = new FormUrlEncodedContent(formData);
            var response = await _httpClient.PostAsync(endpoint, content, ct);
            var json = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
            {
                var result = JsonSerializer.Deserialize<JsonElement>(json);
                var postId = result.GetProperty("id").GetString();
                return new PostResult
                {
                    Success = true,
                    PostId = postId,
                    PostUrl = $"https://www.facebook.com/{postId}",
                    PublishedAt = DateTime.UtcNow
                };
            }

            _logger.LogError("Facebook post failed: {Response}", json);
            return new PostResult { Success = false, ErrorMessage = json };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Facebook publish failed");
            return new PostResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public Task<PostResult> SchedulePostAsync(PostRequest request, DateTime scheduledTime, CancellationToken ct = default)
    {
        request.PlatformSpecific["scheduled_publish_time"] = new DateTimeOffset(scheduledTime).ToUnixTimeSeconds().ToString();
        request.PlatformSpecific["published"] = "false";
        return PublishPostAsync(request, ct);
    }

    public async Task<bool> DeletePostAsync(string postId, PlatformCredentials credentials, CancellationToken ct = default)
    {
        var response = await _httpClient.DeleteAsync(
            $"{postId}?access_token={credentials.AccessToken}", ct);
        return response.IsSuccessStatusCode;
    }

    public async Task<IEnumerable<PostAnalytics>> GetPostAnalyticsAsync(
        string postId, PlatformCredentials credentials, CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync(
            $"{postId}?access_token={credentials.AccessToken}&fields=likes.summary(true),comments.summary(true),shares", ct);

        var json = await response.Content.ReadAsStringAsync(ct);
        var data = JsonSerializer.Deserialize<JsonElement>(json);

        var analytics = new PostAnalytics
        {
            PostId = postId,
            Likes = data.TryGetProperty("likes", out var likes) &&
                    likes.TryGetProperty("summary", out var likesSummary)
                        ? likesSummary.GetProperty("total_count").GetInt64() : 0,
            Comments = data.TryGetProperty("comments", out var comments) &&
                       comments.TryGetProperty("summary", out var commentsSummary)
                        ? commentsSummary.GetProperty("total_count").GetInt64() : 0,
            Shares = data.TryGetProperty("shares", out var shares)
                        ? shares.GetProperty("count").GetInt64() : 0,
            MeasuredAt = DateTime.UtcNow
        };

        return new[] { analytics };
    }

    public async Task<IEnumerable<PlatformComment>> GetCommentsAsync(
        string postId, PlatformCredentials credentials, CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync(
            $"{postId}/comments?access_token={credentials.AccessToken}&fields=id,from,message,created_time,like_count", ct);

        var json = await response.Content.ReadAsStringAsync(ct);
        var data = JsonSerializer.Deserialize<JsonElement>(json);

        var result = new List<PlatformComment>();
        if (data.TryGetProperty("data", out var commentsArray))
        {
            foreach (var comment in commentsArray.EnumerateArray())
            {
                result.Add(new PlatformComment
                {
                    Id = comment.GetProperty("id").GetString() ?? "",
                    AuthorName = comment.TryGetProperty("from", out var from) ?
                        from.GetProperty("name").GetString() ?? "" : "",
                    Content = comment.GetProperty("message").GetString() ?? "",
                    CreatedAt = DateTime.Parse(comment.GetProperty("created_time").GetString() ?? DateTime.UtcNow.ToString()),
                    Likes = comment.TryGetProperty("like_count", out var lc) ? lc.GetInt64() : 0
                });
            }
        }

        return result;
    }

    public async Task<bool> ReplyToCommentAsync(
        string commentId, string reply, PlatformCredentials credentials, CancellationToken ct = default)
    {
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["message"] = reply,
            ["access_token"] = credentials.AccessToken ?? ""
        });

        var response = await _httpClient.PostAsync($"{commentId}/comments", content, ct);
        return response.IsSuccessStatusCode;
    }

    public async Task<IEnumerable<PlatformMessage>> GetMessagesAsync(
        PlatformCredentials credentials, int limit = 50, CancellationToken ct = default)
    {
        var pageId = credentials.AccountId;
        var response = await _httpClient.GetAsync(
            $"{pageId}/conversations?access_token={credentials.AccessToken}&fields=messages{{message,from,created_time}}&limit={limit}", ct);

        var json = await response.Content.ReadAsStringAsync(ct);
        // Parse and return messages
        return new List<PlatformMessage>();
    }

    public async Task<bool> SendMessageAsync(
        string recipientId, string message, PlatformCredentials credentials, CancellationToken ct = default)
    {
        var pageId = credentials.AccountId;
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["recipient"] = $"{{\"id\":\"{recipientId}\"}}",
            ["message"] = $"{{\"text\":\"{message}\"}}",
            ["access_token"] = credentials.AccessToken ?? ""
        });

        var response = await _httpClient.PostAsync($"{pageId}/messages", content, ct);
        return response.IsSuccessStatusCode;
    }
}
