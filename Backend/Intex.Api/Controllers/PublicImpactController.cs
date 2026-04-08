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
            payload?.Utilization,
            payload?.LandingHero,
            payload?.MissionSection,
            payload?.MissionCards,
            payload?.JourneySection,
            payload?.JourneySteps,
            payload?.Testimonial,
            payload?.ProgramTags,
            payload?.TrustStrip));
    }
}

public class PublicMetricPayload
{
    public List<PublicStatItemDto>? LandingStats { get; set; }
    public List<PublicStatItemDto>? ImpactStats { get; set; }
    public List<PublicUtilizationItemDto>? Utilization { get; set; }
    public string? Headline { get; set; }
    public string? Summary { get; set; }

    /// <summary>Optional home hero copy (when set, replaces static defaults on the landing page).</summary>
    public LandingHeroDto? LandingHero { get; set; }

    public MissionSectionDto? MissionSection { get; set; }
    public List<MissionCardDto>? MissionCards { get; set; }

    public JourneySectionDto? JourneySection { get; set; }
    public List<JourneyStepDto>? JourneySteps { get; set; }

    public TestimonialDto? Testimonial { get; set; }
    public List<string>? ProgramTags { get; set; }
    public List<string>? TrustStrip { get; set; }
}

public record LandingHeroDto(string? Eyebrow, string? TitleLine1, string? TitleEmphasis, string? Sub);

public record MissionSectionDto(string? SectionLabel, string? Heading, string? Subtitle);

public record MissionCardDto(string Title, string Description, string? IconKey);

public record JourneySectionDto(string? SectionLabel, string? Heading, string? Subtitle);

public record JourneyStepDto(string Title, string Desc);

public record TestimonialDto(string Quote, string? Attribution);

public record PublicStatItemDto(string Value, string Label);

public record PublicUtilizationItemDto(string Label, int Pct);

public record PublicImpactResponseDto(
    int? SnapshotId,
    string? Headline,
    string? SummaryText,
    IReadOnlyList<PublicStatItemDto>? LandingStats,
    IReadOnlyList<PublicStatItemDto>? ImpactStats,
    IReadOnlyList<PublicUtilizationItemDto>? Utilization,
    LandingHeroDto? LandingHero,
    MissionSectionDto? MissionSection,
    IReadOnlyList<MissionCardDto>? MissionCards,
    JourneySectionDto? JourneySection,
    IReadOnlyList<JourneyStepDto>? JourneySteps,
    TestimonialDto? Testimonial,
    IReadOnlyList<string>? ProgramTags,
    IReadOnlyList<string>? TrustStrip);
