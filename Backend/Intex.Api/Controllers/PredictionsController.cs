using Intex.Api.Data;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

/// <summary>
/// Proxies ML prediction requests to the FastAPI ML service.
/// The React frontend only ever talks to this .NET controller — it never
/// calls the Python API directly.
/// </summary>
[ApiController]
[Route("api/predictions")]
[Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleStaff}")]
public class PredictionsController : ControllerBase
{
    private readonly MlApiService _ml;
    private readonly ILogger<PredictionsController> _logger;

    public PredictionsController(MlApiService ml, ILogger<PredictionsController> logger)
    {
        _ml = ml;
        _logger = logger;
    }

    // GET /api/predictions/donor-churn
    // Returns [{supporterId, displayName, churnProbability, riskLabel}, …]
    [HttpGet("donor-churn")]
    public async Task<IActionResult> GetDonorChurn()
    {
        try
        {
            var result = await _ml.GetDonorChurnAsync();
            // Project to anonymous type so ASP.NET serialises camelCase property names
            // to the frontend. DonorChurnItem carries JsonPropertyName("supporter_id")
            // etc. for deserialising from the ML API — those attributes would otherwise
            // bleed through and emit snake_case JSON to the React client.
            var mapped = result.Select(x => new
            {
                x.SupporterId,
                x.DisplayName,
                x.ChurnProbability,
                x.RiskLabel,
            });
            return Ok(mapped);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ML API call failed: GET /predictions/donor-churn");
            return StatusCode(502, new { error = "ML service unavailable.", detail = ex.Message });
        }
    }

    // GET /api/predictions/reintegration/{residentId}
    // Returns {residentId, readinessScore, readinessLabel}
    [HttpGet("reintegration/{residentId:int}")]
    public async Task<IActionResult> GetReintegration(int residentId)
    {
        try
        {
            var result = await _ml.GetReintegrationAsync(residentId);
            if (result is null) return NotFound();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ML API call failed: GET /predictions/reintegration/{ResidentId}", residentId);
            return StatusCode(502, new { error = "ML service unavailable.", detail = ex.Message });
        }
    }

    // POST /api/predictions/social-post
    // Body: SocialPostRequest (camelCase from frontend)
    // Returns {predictedDonationValue, topRecommendations}
    [HttpPost("social-post")]
    public async Task<IActionResult> PostSocialPost([FromBody] SocialPostRequest body)
    {
        try
        {
            var result = await _ml.PostSocialPostAsync(body);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ML API call failed: POST /predictions/social-post");
            return StatusCode(502, new { error = "ML service unavailable.", detail = ex.Message });
        }
    }
}
