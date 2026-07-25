using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using USAMKO.Core.Constants;
using USAMKO.Platforms.Common;

namespace USAMKO.Platforms.Instagram;

/// <summary>
/// Instagram connector — uses YOUR Instagram/Meta Business app.
/// Supports Instagram Graph API + automation via browser.
/// </summary>
public class InstagramConnector : IPlatformConnector
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<InstagramConnector> _logger;
    private readonly string _appId;
    private readonly string _appSecret;

    public SocialPlatform Platform => SocialPlatform.Instagram;
    public string PlatformName => "Instagram";
    public bool IsConfigured => !string.IsNullOrEmpty(_appId);

    public InstagramConnector(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<InstagramConnector> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _appId = configuration["Platforms:Instagram:AppId"] ?? "";
        _appSecret = configuration["Platforms:Instagram:AppSecret"] ?? "";

        _httpClient.BaseAddress = new Uri("https://graph.instagram.com/");
    }

    public async Task<bool> ValidateCredentialsAsync(PlatformCredentials credentials, CancellationToken ct = default)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"me?access_token={credentials.AccessToken}&fields=id,username", ct);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Instagram credential validation failed");
            return false;
        }
    }

    public async Task<PlatformProfile> GetProfileAsync(PlatformCredentials credentials, CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync(
            $"me?access_token={credentials.AccessToken}&fields=id,username,name,profile_picture_url,followers_count,follows_count,media_count", ct);

        var json = await response.Content.ReadAsStringAsync(ct);
        var data = JsonSerializer.Deserialize<JsonElement>(json);

        return new PlatformProfile
        {
            Id = data.TryGetProperty("id", out var id) ? id.GetString() ?? "" : "",
            Username = data.TryGetProperty("username", out var un) ? un.GetString() ?? "" : "",
            DisplayName = data.TryGetProperty("name", out var name) ? name.GetString() ?? "" : "",
            ProfilePictureUrl = data.TryGetProperty("profile_picture_url", out var pic) ? pic.GetString() : null,
            FollowerCount = data.TryGetProperty("followers_count", out var fc) ? fc.GetInt64() : 0,
            FollowingCount = data.TryGetProperty("follows_count", out var fol) ? fol.GetInt64() : 0,
            PostCount = data.TryGetProperty("media_count", out var mc) ? mc.GetInt64() : 0,
        };
    }

    public async Task<PostResult> PublishPostAsync(PostRequest request, CancellationToken ct = default)
    {
        try
        {
            var igUserId = request.Credentials.AccountId;

            // Step 1: Create media container
            var mediaUrl = request.MediaUrls.FirstOrDefault();
            if (string.IsNullOrEmpty(mediaUrl))
            {
                return new PostResult { Success = false, ErrorMessage = "Instagram requires at least one image." };
            }

            var createParams = new Dictionary<string, string>
            {
                ["image_url"] = mediaUrl,
                ["caption"] = request.Content,
                ["access_token"] = request.Credentials.AccessToken ?? ""
            };

            var createContent = new FormUrlEncodedContent(createParams);
            var createResponse = await _httpClient.PostAsync($"{igUserId}/media", createContent, ct);
            var createJson = await createResponse.Content.ReadAsStringAsync(ct);

            if (!createResponse.IsSuccessStatusCode)
            {
                return new PostResult { Success = false, ErrorMessage = createJson };
            }

            var createResult = JsonSerializer.Deserialize<JsonElement>(createJson);
            var containerId = createResult.GetProperty("id").GetString();

            // Step 2: Publish the container
            var publishParams = new Dictionary<string, string>
            {
                ["creation_id"] = containerId ?? "",
                ["access_token"] = request.Credentials.AccessToken ?? ""
            };

            var publishContent = new FormUrlEncodedContent(publishParams);
            var publishResponse = await _httpClient.PostAsync($"{igUserId}/media_publish", publishContent, ct);
            var publishJson = await publishResponse.Content.ReadAsStringAsync(ct);

            if (publishResponse.IsSuccessStatusCode)
            {
                var publishResult = JsonSerializer.Deserialize<JsonElement>(publishJson);
                var postId = publishResult.GetProperty("id").GetString();
                return new PostResult
                {
                    Success = true,
                    PostId = postId,
                    PostUrl = $"https://www.instagram.com/p/{postId}",
                    PublishedAt = DateTime.UtcNow
                };
            }

            return new PostResult { Success = false, ErrorMessage = publishJson };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Instagram publish failed");
            return new PostResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public Task<PostResult> SchedulePostAsync(PostRequest request, DateTime scheduledTime, CancellationToken ct = default)
    {
        // Instagram API doesn't support native scheduling - handled by USAMKO scheduler
        return Task.FromResult(new PostResult
        {
            Success = true,
            ErrorMessage = "Scheduled via USAMKO engine (Instagram doesn't support native scheduling)"
        });
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
            $"{postId}/insights?metric=impressions,reach,engagement&access_token={credentials.AccessToken}", ct);

        // Parse insights response
        return new[] { new PostAnalytics { PostId = postId, MeasuredAt = DateTime.UtcNow } };
    }

    public async Task<IEnumerable<PlatformComment>> GetCommentsAsync(
        string postId, PlatformCredentials credentials, CancellationToken ct = default)
    {
        var response = await _httpClient.GetAsync(
            $"{postId}/comments?access_token={credentials.AccessToken}&fields=id,text,username,timestamp,like_count", ct);

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
                    AuthorName = comment.TryGetProperty("username", out var user) ? user.GetString() ?? "" : "",
                    Content = comment.TryGetProperty("text", out var text) ? text.GetString() ?? "" : "",
                    CreatedAt = comment.TryGetProperty("timestamp", out var ts) ? DateTime.Parse(ts.GetString() ?? "") : DateTime.UtcNow,
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

        var response = await _httpClient.PostAsync($"{commentId}/replies", content, ct);
        return response.IsSuccessStatusCode;
    }

    public Task<IEnumerable<PlatformMessage>> GetMessagesAsync(
        PlatformCredentials credentials, int limit = 50, CancellationToken ct = default)
    {
        // Instagram DMs via API require special permission
        return Task.FromResult<IEnumerable<PlatformMessage>>(new List<PlatformMessage>());
    }

    public Task<bool> SendMessageAsync(
        string recipientId, string message, PlatformCredentials credentials, CancellationToken ct = default)
    {
        // Instagram DMs via API require special permission
        return Task.FromResult(false);
    }
}
