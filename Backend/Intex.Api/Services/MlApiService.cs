using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Intex.Api.Services;

/// <summary>
/// Thin HTTP client wrapper for the Harbor of Hope ML API (FastAPI).
///
/// Configuration (Azure App Service → Configuration, or appsettings / env):
///   ML__BaseUrl   — base URL of the ML service, e.g. https://intex-ml-api.azurewebsites.net
///   ML__ApiKey    — value of the X-Ml-Api-Key header (must match ML_API_KEY on the Python side)
/// </summary>
public class MlApiService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;

    // Snake_case options for deserialising the FastAPI JSON responses.
    private static readonly JsonSerializerOptions _fromSnake = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    // Snake_case options for serialising request bodies sent to FastAPI.
    private static readonly JsonSerializerOptions _toSnake = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    public MlApiService(IHttpClientFactory factory, IConfiguration config)
    {
        _http = factory.CreateClient("MlApi");
        _apiKey = config["ML:ApiKey"] ?? "";
    }

    private void AddKey(HttpRequestMessage req)
    {
        if (!string.IsNullOrEmpty(_apiKey))
            req.Headers.Add("X-Ml-Api-Key", _apiKey);
    }

    // -----------------------------------------------------------------------
    // Donor churn batch
    // -----------------------------------------------------------------------

    public async Task<IReadOnlyList<DonorChurnItem>> GetDonorChurnAsync()
    {
        var req = new HttpRequestMessage(HttpMethod.Get, "/predictions/donor-churn");
        AddKey(req);
        var res = await _http.SendAsync(req);
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<List<DonorChurnItem>>(json, _fromSnake)
               ?? [];
    }

    // -----------------------------------------------------------------------
    // Reintegration readiness (single resident)
    // -----------------------------------------------------------------------

    public async Task<ReintegrationResult?> GetReintegrationAsync(int residentId)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"/predictions/reintegration/{residentId}");
        AddKey(req);
        var res = await _http.SendAsync(req);
        if (res.StatusCode == System.Net.HttpStatusCode.NotFound) return null;
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ReintegrationResult>(json, _fromSnake);
    }

    // -----------------------------------------------------------------------
    // Social-post value prediction
    // -----------------------------------------------------------------------

    public async Task<SocialPostResult> PostSocialPostAsync(SocialPostRequest body)
    {
        var json = JsonSerializer.Serialize(body, _toSnake);
        var req = new HttpRequestMessage(HttpMethod.Post, "/predictions/social-post")
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json"),
        };
        AddKey(req);
        var res = await _http.SendAsync(req);
        res.EnsureSuccessStatusCode();
        var responseJson = await res.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<SocialPostResult>(responseJson, _fromSnake)
               ?? new SocialPostResult(0, []);
    }
}

// ---------------------------------------------------------------------------
// DTOs — property names match the ML API's snake_case JSON output.
// ASP.NET Core's default camelCase serialiser will re-emit them as camelCase
// to the React frontend (supporterId, churnProbability, etc.).
// ---------------------------------------------------------------------------

public record DonorChurnItem(
    [property: JsonPropertyName("supporter_id")]   int    SupporterId,
    [property: JsonPropertyName("display_name")]   string DisplayName,
    [property: JsonPropertyName("churn_probability")] double ChurnProbability,
    [property: JsonPropertyName("risk_label")]     string RiskLabel);

public record ReintegrationResult(
    [property: JsonPropertyName("resident_id")]    int    ResidentId,
    [property: JsonPropertyName("readiness_score")] double ReadinessScore,
    [property: JsonPropertyName("readiness_label")] string ReadinessLabel);

/// <summary>Request body forwarded from the frontend (camelCase) → serialised as snake_case to FastAPI.</summary>
public record SocialPostRequest(
    string Platform,
    string PostType,
    string MediaType,
    string SentimentTone,
    string ContentTopic,
    int    PostHour,
    string DayOfWeek,
    int    IsBoosted,
    int    NumHashtags,
    int    HasCallToAction,
    int    FeaturesResidentStory,
    int    CaptionLength,
    double EngagementRate);

public record SocialPostResult(
    [property: JsonPropertyName("predicted_donation_value")] double PredictedDonationValue,
    [property: JsonPropertyName("top_recommendations")]      IReadOnlyList<string> TopRecommendations);
