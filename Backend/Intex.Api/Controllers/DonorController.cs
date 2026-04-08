using System.Security.Claims;
using Intex.Api.Data;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/donors")]
public class DonorController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public DonorController(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db    = db;
        _users = users;
    }

    // -----------------------------------------------------------------------
    // GET endpoints
    // -----------------------------------------------------------------------

    /// <summary>
    /// Returns donation history.
    /// Admins see all records; Donors see only their own (scoped by SupporterId).
    /// </summary>
    [Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleDonor}")]
    [HttpGet("history")]
    public async Task<IActionResult> GetDonationHistory()
    {
        IQueryable<Donation> query = _db.Donations;

        if (!User.IsInRole(DatabaseSeeder.RoleAdmin))
        {
            var userId  = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var appUser = await _users.FindByIdAsync(userId!);

            if (appUser?.SupporterId is null)
                return Ok(Array.Empty<object>());

            query = query.Where(d => d.SupporterId == appUser.SupporterId);
        }

        var donations = await query
            .OrderByDescending(d => d.DonationDate)
            .Select(d => new
            {
                d.DonationId,
                d.SupporterId,
                d.DonationType,
                d.DonationDate,
                d.IsRecurring,
                d.CampaignName,
                d.ChannelSource,
                d.CurrencyCode,
                d.Amount,
                d.EstimatedValue,
                d.ImpactUnit,
                d.Notes,
                d.ReferralPostId
            })
            .ToListAsync();

        return Ok(donations);
    }

    /// <summary>
    /// Returns the supporter profile and giving totals for the logged-in donor.
    /// Admins can query any supporter via ?supporterId=N.
    /// </summary>
    [Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleDonor}")]
    [HttpGet("profile")]
    public async Task<IActionResult> GetDonorProfile([FromQuery] int? supporterId)
    {
        int? sid;

        if (User.IsInRole(DatabaseSeeder.RoleAdmin) && supporterId.HasValue)
        {
            sid = supporterId;
        }
        else
        {
            var userId  = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var appUser = await _users.FindByIdAsync(userId!);
            sid = appUser?.SupporterId;
        }

        if (sid is null)
            return NotFound(new { message = "No supporter record is linked to this account." });

        var supporter = await _db.Supporters.FirstOrDefaultAsync(s => s.SupporterId == sid);
        if (supporter is null)
            return NotFound(new { message = $"Supporter {sid} not found." });

        var lifetimeGiving = await _db.Donations
            .Where(d => d.SupporterId == sid)
            .SumAsync(d => d.Amount ?? 0m);

        var lastGift = await _db.Donations
            .Where(d => d.SupporterId == sid)
            .OrderByDescending(d => d.DonationDate)
            .Select(d => (DateOnly?)d.DonationDate)
            .FirstOrDefaultAsync();

        var totalGifts = await _db.Donations
            .CountAsync(d => d.SupporterId == sid);

        return Ok(new
        {
            supporter.SupporterId,
            Name = supporter.DisplayName
                ?? $"{supporter.FirstName} {supporter.LastName}".Trim(),
            supporter.Email,
            supporter.Status,
            supporter.Region,
            supporter.Country,
            supporter.AcquisitionChannel,
            supporter.FirstDonationDate,
            lifetimeGiving,
            lastGift,
            totalGifts
        });
    }

    /// <summary>
    /// Returns impact summary aggregated from the lighthouse donations table.
    /// </summary>
    [Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleDonor}")]
    [HttpGet("impact")]
    public async Task<IActionResult> GetImpactData()
    {
        var totalRaised = await _db.Donations.SumAsync(d => d.Amount ?? 0m);
        var totalDonors = await _db.Supporters.CountAsync(s => s.Status == "Active");

        return Ok(new
        {
            totalRaised,
            totalDonors,
            totalDonations = await _db.Donations.CountAsync()
        });
    }

    // -----------------------------------------------------------------------
    // Mutating endpoints — Admin only
    // -----------------------------------------------------------------------

    /// <summary>Records a new donation.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpPost]
    public async Task<IActionResult> CreateDonation([FromBody] CreateDonationRequest request)
    {
        var donation = new Donation
        {
            SupporterId   = request.SupporterId,
            DonationType  = request.DonationType,
            DonationDate  = request.DonationDate,
            IsRecurring   = request.IsRecurring,
            CampaignName  = request.CampaignName,
            ChannelSource = request.ChannelSource,
            CurrencyCode  = request.CurrencyCode ?? "PHP",
            Amount        = request.Amount,
            Notes         = request.Notes
        };

        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();
        return Created("", donation);
    }

    /// <summary>Updates an existing donation record.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateDonation(int id, [FromBody] CreateDonationRequest request)
    {
        var donation = await _db.Donations.FindAsync(id);
        if (donation is null) return NotFound();

        donation.Amount       = request.Amount;
        donation.Notes        = request.Notes;
        donation.CampaignName = request.CampaignName;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Deletes a donation record.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteDonation(int id)
    {
        var donation = await _db.Donations.FindAsync(id);
        if (donation is null) return NotFound();

        _db.Donations.Remove(donation);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public record CreateDonationRequest(
    int? SupporterId,
    string? DonationType,
    DateOnly? DonationDate,
    bool? IsRecurring,
    string? CampaignName,
    string? ChannelSource,
    string? CurrencyCode,
    decimal? Amount,
    string? Notes);
