using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleStaff}")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db) => _db = db;

    /// <summary>
    /// Monthly monetary donation totals (PHP) over time.
    /// </summary>
    [HttpGet("donations/monthly")]
    public async Task<IActionResult> DonationTrend(CancellationToken ct)
    {
        var rows = await _db.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate != null && d.Amount != null && d.Amount > 0)
            .Select(d => new { d.DonationDate, d.Amount })
            .ToListAsync(ct);

        var points = rows
            .GroupBy(d => new DateOnly(d.DonationDate!.Value.Year, d.DonationDate.Value.Month, 1))
            .OrderBy(g => g.Key)
            .Select(g => new DonationMonthlyPointDto(
                g.Key.ToString("yyyy-MM"),
                Math.Round((double)g.Sum(d => d.Amount!.Value), 2),
                g.Count()))
            .ToList();

        return Ok(points);
    }

    /// <summary>
    /// Per-safehouse resident stats: total residents ever, currently active, and successfully reintegrated.
    /// </summary>
    [HttpGet("safehouses/performance")]
    public async Task<IActionResult> SafehousePerformance(CancellationToken ct)
    {
        var safehouses = await _db.Safehouses
            .AsNoTracking()
            .Select(s => new { s.SafehouseId, s.Name, s.Region })
            .ToListAsync(ct);

        var residents = await _db.Residents
            .AsNoTracking()
            .Where(r => r.SafehouseId != null)
            .Select(r => new
            {
                r.SafehouseId,
                IsActive = r.DateClosed == null,
                r.ReintegrationStatus,
            })
            .ToListAsync(ct);

        var byHouse = residents
            .GroupBy(r => r.SafehouseId!.Value)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Total  = g.Count(),
                    Active = g.Count(r => r.IsActive),
                    Reintegrated = g.Count(r =>
                        r.ReintegrationStatus != null &&
                        (r.ReintegrationStatus.Equals("Successful", StringComparison.OrdinalIgnoreCase) ||
                         r.ReintegrationStatus.Equals("Reintegrated", StringComparison.OrdinalIgnoreCase) ||
                         r.ReintegrationStatus.Equals("Completed", StringComparison.OrdinalIgnoreCase)))
                });

        var result = safehouses
            .Select(s =>
            {
                byHouse.TryGetValue(s.SafehouseId, out var stats);
                return new SafehousePerformanceDto(
                    s.Name,
                    s.Region ?? "Unknown",
                    stats?.Total ?? 0,
                    stats?.Active ?? 0,
                    stats?.Reintegrated ?? 0);
            })
            .Where(x => x.TotalResidents > 0)
            .OrderByDescending(x => x.TotalResidents)
            .ToList();

        return Ok(result);
    }

    /// <summary>
    /// Counts of residents grouped by their current reintegration status.
    /// </summary>
    [HttpGet("residents/reintegration")]
    public async Task<IActionResult> ReintegrationBreakdown(CancellationToken ct)
    {
        var rows = await _db.Residents
            .AsNoTracking()
            .Select(r => new { r.ReintegrationStatus })
            .ToListAsync(ct);

        var result = rows
            .GroupBy(r => string.IsNullOrWhiteSpace(r.ReintegrationStatus) ? "Not Set" : r.ReintegrationStatus)
            .Select(g => new ReintegrationStatusDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .ToList();

        return Ok(result);
    }
}

public record DonationMonthlyPointDto(string Month, double Total, int Count);

public record SafehousePerformanceDto(
    string Name,
    string Region,
    int TotalResidents,
    int ActiveResidents,
    int ReintegratedCount);

public record ReintegrationStatusDto(string Status, int Count);
