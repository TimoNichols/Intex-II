using System.Security.Claims;
using Intex.Api.Data;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public AdminController(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db    = db;
        _users = users;
    }

    [Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleStaff}")]
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var yearStart = new DateOnly(DateTime.UtcNow.Year, 1, 1);
        var today     = DateOnly.FromDateTime(DateTime.UtcNow);

        var activeResidents = await _db.Residents.CountAsync(r => r.DateClosed == null);

        var donorsThisYear = await _db.Donations
            .Where(d => d.SupporterId != null && d.DonationDate >= yearStart && d.DonationDate <= today)
            .Select(d => d.SupporterId!.Value)
            .Distinct()
            .CountAsync();

        var ytdFunds = await _db.Donations
            .Where(d => d.DonationDate >= yearStart && d.DonationDate <= today)
            .SumAsync(d => d.Amount ?? 0m);

        var openMdt = await _db.InterventionPlans.CountAsync(p =>
            p.Status == null
            || (p.Status != "Completed" && p.Status != "completed"
                && p.Status != "Closed" && p.Status != "closed"
                && p.Status != "Done" && p.Status != "done"));

        var stats = new[]
        {
            new DashboardStatDto(activeResidents.ToString(), "Active residents"),
            new DashboardStatDto(donorsThisYear.ToString(), "Donors this year"),
            new DashboardStatDto(FormatMoney(ytdFunds), "YTD program funds"),
            new DashboardStatDto(openMdt.ToString(), "Open MDT actions"),
        };

        var activity = new List<ActivityItemDto>();

        var recentDonations = await _db.Donations
            .AsNoTracking()
            .Where(d => d.SupporterId != null)
            .OrderByDescending(d => d.DonationDate)
            .ThenByDescending(d => d.DonationId)
            .Take(4)
            .Join(_db.Supporters.AsNoTracking(), d => d.SupporterId, s => s.SupporterId, (d, s) => new { d, s })
            .ToListAsync();

        foreach (var x in recentDonations)
        {
            var name = !string.IsNullOrWhiteSpace(x.s.OrganizationName)
                ? x.s.OrganizationName
                : (x.s.DisplayName ?? $"{x.s.FirstName} {x.s.LastName}".Trim());
            if (string.IsNullOrWhiteSpace(name)) name = $"Supporter #{x.s.SupporterId}";
            var amt = x.d.Amount ?? 0m;
            activity.Add(new ActivityItemDto(
                $"donation-{x.d.DonationId}",
                "Gift received",
                $"{FormatMoney(amt)} from {name}",
                ToActivityTimestamp(x.d.DonationDate)));
        }

        var recentResidents = await _db.Residents
            .AsNoTracking()
            .OrderByDescending(r => r.CreatedAt)
            .ThenByDescending(r => r.DateOfAdmission)
            .ThenByDescending(r => r.ResidentId)
            .Take(3)
            .ToListAsync();

        foreach (var r in recentResidents)
        {
            var label = ResidentLabels.DisplayName(r);
            var shName = "—";
            if (r.SafehouseId is { } sid)
            {
                shName = await _db.Safehouses.AsNoTracking()
                    .Where(sh => sh.SafehouseId == sid)
                    .Select(sh => sh.Name)
                    .FirstOrDefaultAsync() ?? "—";
            }

            activity.Add(new ActivityItemDto(
                $"resident-{r.ResidentId}",
                "Case updated",
                $"{label} — {shName}",
                (r.CreatedAt ?? (r.DateOfAdmission != null
                    ? new DateTimeOffset(r.DateOfAdmission.Value.ToDateTime(TimeOnly.MinValue))
                    : (DateTimeOffset?)null))?.UtcDateTime ?? DateTime.UtcNow));
        }

        var plans = await _db.InterventionPlans
            .AsNoTracking()
            .Where(p => p.CaseConferenceDate != null || p.TargetDate != null)
            .OrderByDescending(p => p.CaseConferenceDate ?? p.TargetDate)
            .Take(3)
            .ToListAsync();

        foreach (var p in plans)
        {
            var rid = p.ResidentId;
            string resLabel = "Resident";
            if (rid is { } id)
            {
                var res = await _db.Residents.AsNoTracking().FirstOrDefaultAsync(x => x.ResidentId == id);
                resLabel = res is null ? $"Resident #{id}" : ResidentLabels.DisplayName(res);
            }

            var when = p.CaseConferenceDate ?? p.TargetDate;
            activity.Add(new ActivityItemDto(
                $"plan-{p.PlanId}",
                "Conference / plan",
                $"{resLabel} — {p.PlanCategory ?? "MDT"}",
                when.HasValue
                    ? new DateTimeOffset(when.Value.ToDateTime(TimeOnly.MinValue)).UtcDateTime
                    : DateTime.UtcNow));
        }

        activity = activity
            .OrderByDescending(a => a.OccurredAt)
            .Take(12)
            .ToList();

        return Ok(new DashboardResponseDto(stats, activity));
    }

    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpGet("users")]
    public async Task<IActionResult> Users()
    {
        var list = await _users.Users.AsNoTracking().OrderBy(u => u.Email).ToListAsync();
        var items = new List<AdminUserRowDto>();

        foreach (var u in list)
        {
            var roles = await _users.GetRolesAsync(u);
            var role = roles.FirstOrDefault() ?? "—";
            var status = await ResolveUserStatusAsync(u);
            items.Add(new AdminUserRowDto(u.Id, u.DisplayName ?? u.Email ?? u.Id, u.Email ?? "—", role, status));
        }

        return Ok(items);
    }

    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var currentId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (id == currentId) return BadRequest(new { message = "You cannot delete your own account." });

        var user = await _users.FindByIdAsync(id);
        if (user is null) return NotFound();

        var result = await _users.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join("; ", result.Errors.Select(e => e.Description)) });

        return NoContent();
    }

    private async Task<string> ResolveUserStatusAsync(ApplicationUser u)
    {
        if (await _users.IsLockedOutAsync(u)) return "Locked";
        if (!u.EmailConfirmed) return "Invited";
        return "Active";
    }

    private static string FormatMoney(decimal n) =>
        n >= 1_000_000m ? $"${n / 1_000_000m:0.##}M" : n >= 1000m ? $"${n / 1000m:0.##}K" : $"${n:0}";

    private static DateTime ToActivityTimestamp(DateOnly? d) =>
        d is { } x ? new DateTimeOffset(x.ToDateTime(TimeOnly.MinValue)).UtcDateTime : DateTime.UtcNow;
}

public record DashboardStatDto(string Value, string Label);

public record ActivityItemDto(string Id, string Label, string Detail, DateTime OccurredAt);

public record DashboardResponseDto(IReadOnlyList<DashboardStatDto> Stats, IReadOnlyList<ActivityItemDto> Activity);

public record AdminUserRowDto(string Id, string Name, string Email, string Role, string Status);
