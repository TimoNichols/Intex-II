using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/supporters")]
[Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleStaff}")]
public class SupportersController : ControllerBase
{
    private readonly AppDbContext _db;

    public SupportersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? q, [FromQuery] int skip = 0, [FromQuery] int take = 200)
    {
        take = Math.Clamp(take, 1, 500);
        skip = Math.Max(0, skip);

        var aggregates = await _db.Donations
            .Where(d => d.SupporterId != null)
            .GroupBy(d => d.SupporterId!.Value)
            .Select(g => new
            {
                SupporterId = g.Key,
                Lifetime = g.Sum(d => d.Amount ?? 0m),
                LastDate = g.Max(d => d.DonationDate),
            })
            .ToDictionaryAsync(x => x.SupporterId, x => x);

        var query = _db.Supporters.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var s = q.Trim().ToLowerInvariant();
            query = query.Where(x =>
                (x.DisplayName != null && x.DisplayName.ToLower().Contains(s)) ||
                (x.OrganizationName != null && x.OrganizationName.ToLower().Contains(s)) ||
                (x.FirstName != null && x.FirstName.ToLower().Contains(s)) ||
                (x.LastName != null && x.LastName.ToLower().Contains(s)) ||
                (x.Email != null && x.Email.ToLower().Contains(s)) ||
                x.SupporterId.ToString() == s);
        }

        var total = await query.CountAsync();
        var rows = await query
            .OrderBy(x => x.DisplayName ?? x.OrganizationName ?? x.Email ?? x.SupporterId.ToString())
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var items = rows.Select(s =>
        {
            aggregates.TryGetValue(s.SupporterId, out var agg);
            var lifetime = agg?.Lifetime ?? 0m;
            var last = agg?.LastDate;
            return new SupporterListItemDto(
                s.SupporterId,
                ResolveSupporterName(s),
                s.Email ?? "—",
                lifetime,
                last?.ToString("yyyy-MM-dd") ?? "—",
                ResolveDonorStatus(s.Status, lifetime, last));
        }).ToList();

        return Ok(new PagedResult<SupporterListItemDto>(items, total, skip, take));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var s = await _db.Supporters.AsNoTracking().FirstOrDefaultAsync(x => x.SupporterId == id);
        if (s is null) return NotFound();

        var donations = await _db.Donations
            .AsNoTracking()
            .Where(d => d.SupporterId == id)
            .OrderByDescending(d => d.DonationDate)
            .ThenByDescending(d => d.DonationId)
            .Select(d => new DonationRowDto(
                d.DonationId,
                d.DonationDate == null ? "—" : d.DonationDate.Value.ToString("yyyy-MM-dd"),
                d.Amount ?? 0m,
                d.CampaignName ?? "General",
                d.DonationType ?? "—"))
            .ToListAsync();

        var lifetime = donations.Sum(d => d.Amount);
        var lastDate = donations.Count > 0 && DateOnly.TryParse(donations[0].Date, out var ld) ? ld : (DateOnly?)null;

        var detail = new SupporterDetailDto(
            s.SupporterId,
            ResolveSupporterName(s),
            s.Email ?? "—",
            lifetime,
            lastDate?.ToString("yyyy-MM-dd") ?? "—",
            ResolveDonorStatus(s.Status, lifetime, lastDate),
            s.AcquisitionChannel,
            s.Region,
            s.Country,
            donations);

        return Ok(detail);
    }

    private static string ResolveSupporterName(Models.Supporter s)
    {
        if (!string.IsNullOrWhiteSpace(s.OrganizationName)) return s.OrganizationName.Trim();
        if (!string.IsNullOrWhiteSpace(s.DisplayName)) return s.DisplayName.Trim();
        var fn = s.FirstName ?? "";
        var ln = s.LastName ?? "";
        var combined = $"{fn} {ln}".Trim();
        return string.IsNullOrEmpty(combined) ? $"Supporter #{s.SupporterId}" : combined;
    }

    private static string ResolveDonorStatus(string? dbStatus, decimal lifetime, DateOnly? lastGift)
    {
        if (!string.IsNullOrWhiteSpace(dbStatus))
        {
            var u = dbStatus.Trim();
            if (u.Equals("Active", StringComparison.OrdinalIgnoreCase)) return "Active";
            if (u.Equals("Lapsed", StringComparison.OrdinalIgnoreCase)) return "Lapsed";
            if (u.Equals("Major", StringComparison.OrdinalIgnoreCase)) return "Major";
        }

        if (lifetime >= 50_000m) return "Major";
        if (lastGift is { } d)
        {
            var days = DateOnly.FromDateTime(DateTime.UtcNow).DayNumber - d.DayNumber;
            if (days > 365) return "Lapsed";
        }

        return "Active";
    }
}

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Skip, int Take);

public record SupporterListItemDto(
    int SupporterId,
    string Name,
    string Email,
    decimal LifetimeGiving,
    string LastGift,
    string Status);

public record SupporterDetailDto(
    int SupporterId,
    string Name,
    string Email,
    decimal LifetimeGiving,
    string LastGift,
    string Status,
    string? AcquisitionChannel,
    string? Region,
    string? Country,
    IReadOnlyList<DonationRowDto> Donations);

public record DonationRowDto(int DonationId, string Date, decimal Amount, string Fund, string Method);
