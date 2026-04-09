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

    /// <summary>
    /// Cumulative resident bed capacity over time from the safehouses registry (opening dates + capacity_girls).
    /// Public, no auth — for the impact transparency dashboard.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("safehouses/capacity-timeline")]
    public async Task<IActionResult> GetSafehouseCapacityTimeline(CancellationToken ct)
    {
        var rows = await _db.Safehouses
            .AsNoTracking()
            .Where(s => s.CapacityGirls != null && s.CapacityGirls > 0)
            .Select(s => new { s.OpenDate, Capacity = s.CapacityGirls!.Value })
            .ToListAsync(ct);

        if (rows.Count == 0)
            return Ok(new SafehouseCapacityTimelineResponse(Array.Empty<SafehouseCapacityTimelinePointDto>(), null));

        var undatedCapacity = rows.Where(r => !r.OpenDate.HasValue).Sum(r => r.Capacity);
        var dated = rows
            .Where(r => r.OpenDate.HasValue)
            .Select(r =>
            {
                var d = r.OpenDate!.Value;
                return (Month: new DateOnly(d.Year, d.Month, 1), r.Capacity);
            })
            .ToList();

        var points = new List<SafehouseCapacityTimelinePointDto>();
        var running = 0;
        foreach (var g in dated.GroupBy(x => x.Month).OrderBy(g => g.Key))
        {
            running += g.Sum(x => x.Capacity);
            points.Add(new SafehouseCapacityTimelinePointDto(g.Key.ToString("yyyy-MM-dd"), running));
        }

        string? note = null;
        if (undatedCapacity > 0)
        {
            if (points.Count == 0)
            {
                points.Add(new SafehouseCapacityTimelinePointDto(DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd"), undatedCapacity));
                note = "Total includes locations without a recorded opening date.";
            }
            else
            {
                var last = points[^1];
                points[^1] = last with { TotalCapacityGirls = last.TotalCapacityGirls + undatedCapacity };
                note = "Final total includes beds at locations without a recorded opening date.";
            }
        }

        return Ok(new SafehouseCapacityTimelineResponse(points, note));
    }

    /// <summary>
    /// Monthly aggregated metrics (avg education progress, avg health score, total active residents)
    /// across all safehouses. Public, no auth.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("monthly-metrics")]
    public async Task<IActionResult> GetMonthlyMetrics(CancellationToken ct)
    {
        var rows = await _db.SafehouseMonthlyMetrics
            .AsNoTracking()
            .Where(m => m.MonthStart != null &&
                        (m.AvgEducationProgress != null || m.AvgHealthScore != null))
            .Select(m => new {
                m.MonthStart,
                m.ActiveResidents,
                m.AvgEducationProgress,
                m.AvgHealthScore
            })
            .ToListAsync(ct);

        var points = rows
            .GroupBy(m => new DateOnly(m.MonthStart!.Value.Year, m.MonthStart.Value.Month, 1))
            .OrderBy(g => g.Key)
            .Select(g =>
            {
                var eduRows = g.Where(m => m.AvgEducationProgress.HasValue).ToList();
                var hlthRows = g.Where(m => m.AvgHealthScore.HasValue).ToList();
                return new MonthlyMetricPointDto(
                    g.Key.ToString("yyyy-MM"),
                    g.Sum(m => m.ActiveResidents ?? 0),
                    eduRows.Count > 0 ? Math.Round((double)eduRows.Average(m => m.AvgEducationProgress!.Value), 1) : null,
                    hlthRows.Count > 0 ? Math.Round((double)hlthRows.Average(m => m.AvgHealthScore!.Value), 2) : null
                );
            })
            .ToList();

        return Ok(points);
    }

    /// <summary>
    /// Current occupancy vs capacity grouped by region from the safehouses table. Public, no auth.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("safehouses/occupancy")]
    public async Task<IActionResult> GetOccupancyByRegion(CancellationToken ct)
    {
        var safehouses = await _db.Safehouses
            .AsNoTracking()
            .Where(s => s.Region != null)
            .Select(s => new { s.Region, s.CapacityGirls, s.CurrentOccupancy })
            .ToListAsync(ct);

        var result = safehouses
            .GroupBy(s => s.Region!)
            .Select(g => new RegionOccupancyDto(
                g.Key,
                g.Sum(s => s.CapacityGirls ?? 0),
                g.Sum(s => s.CurrentOccupancy ?? 0),
                g.Count()
            ))
            .OrderBy(r => r.Region)
            .ToList();

        return Ok(result);
    }

    /// <summary>
    /// Total donation allocations grouped by program area. Public, no auth.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("donations/by-program")]
    public async Task<IActionResult> GetDonationsByProgram(CancellationToken ct)
    {
        var allocations = await _db.DonationAllocations
            .AsNoTracking()
            .Where(a => a.ProgramArea != null && a.AmountAllocated != null)
            .Select(a => new { a.ProgramArea, a.AmountAllocated })
            .ToListAsync(ct);

        var result = allocations
            .GroupBy(a => a.ProgramArea!)
            .Select(g => new ProgramAreaAllocationDto(
                g.Key,
                Math.Round((double)g.Sum(a => a.AmountAllocated!.Value))
            ))
            .OrderByDescending(x => x.TotalAllocated)
            .ToList();

        return Ok(result);
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

public record SafehouseCapacityTimelinePointDto(string Period, int TotalCapacityGirls);

public record MonthlyMetricPointDto(string Month, int TotalActiveResidents, double? AvgEducationProgress, double? AvgHealthScore);

public record RegionOccupancyDto(string Region, int TotalCapacity, int TotalOccupancy, int SafehouseCount);

public record ProgramAreaAllocationDto(string ProgramArea, double TotalAllocated);

public record SafehouseCapacityTimelineResponse(
    IReadOnlyList<SafehouseCapacityTimelinePointDto> Points,
    string? Note);

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
