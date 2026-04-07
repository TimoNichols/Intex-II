using System.Text.Json;
using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/public")]
public class PublicImpactController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private readonly AppDbContext _db;

    public PublicImpactController(AppDbContext db) => _db = db;

    /// <summary>
    /// Latest published impact snapshot for public marketing pages (no auth).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("impact")]
    public async Task<IActionResult> GetImpact()
    {
        var snap = await _db.PublicImpactSnapshots
            .AsNoTracking()
            .Where(s => s.IsPublished == true)
            .OrderByDescending(s => s.PublishedAt ?? s.SnapshotDate)
            .ThenByDescending(s => s.SnapshotId)
            .FirstOrDefaultAsync();

        PublicMetricPayload? payload = null;
        if (!string.IsNullOrWhiteSpace(snap?.MetricPayloadJson))
        {
            try
            {
                payload = JsonSerializer.Deserialize<PublicMetricPayload>(snap.MetricPayloadJson, JsonOpts);
            }
            catch
            {
                /* ignore malformed json */
            }
        }

        return Ok(new PublicImpactResponseDto(
            snap?.SnapshotId,
            snap?.Headline,
            snap?.SummaryText,
            payload?.LandingStats,
            payload?.ImpactStats,
            payload?.Utilization));
    }
}

public class PublicMetricPayload
{
    public List<PublicStatItemDto>? LandingStats { get; set; }
    public List<PublicStatItemDto>? ImpactStats { get; set; }
    public List<PublicUtilizationItemDto>? Utilization { get; set; }
    public string? Headline { get; set; }
    public string? Summary { get; set; }
}

public record PublicStatItemDto(string Value, string Label);

public record PublicUtilizationItemDto(string Label, int Pct);

public record PublicImpactResponseDto(
    int? SnapshotId,
    string? Headline,
    string? SummaryText,
    IReadOnlyList<PublicStatItemDto>? LandingStats,
    IReadOnlyList<PublicStatItemDto>? ImpactStats,
    IReadOnlyList<PublicUtilizationItemDto>? Utilization);
