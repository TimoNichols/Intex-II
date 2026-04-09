using System.Security.Claims;
using Intex.Api.Data;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/donations")]
public class DonationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public DonationsController(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db    = db;
        _users = users;
    }

    /// <summary>
    /// Records a donation submitted by the logged-in supporter.
    /// Reads supporter_id from the JWT claim (set at login); falls back to a DB
    /// lookup if the token pre-dates the claim addition.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreateDonation([FromBody] SubmitDonationRequest request)
    {
        // Prefer the supporter_id JWT claim to avoid a round-trip.
        var supporterIdClaim = User.FindFirstValue("supporter_id");
        int? supporterId = null;

        if (int.TryParse(supporterIdClaim, out var sid) && sid > 0)
        {
            supporterId = sid;
        }
        else
        {
            var userId  = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var appUser = await _users.FindByIdAsync(userId!);
            supporterId = appUser?.SupporterId;
        }

        if (supporterId is null)
            return BadRequest(new { message = "No supporter record is linked to your account." });

        var isMonetary = request.DonationType == "Monetary";

        var donation = new Donation
        {
            SupporterId   = supporterId,
            DonationType  = request.DonationType,
            DonationDate  = DateOnly.FromDateTime(DateTime.UtcNow),
            IsRecurring   = request.IsRecurring,
            CampaignName  = request.CampaignName?.Trim(),
            ChannelSource = request.ChannelSource,
            CurrencyCode  = isMonetary ? (request.CurrencyCode ?? "PHP") : null,
            Amount        = isMonetary ? request.Amount : null,
            Notes         = request.Notes?.Trim(),
        };

        _db.Donations.Add(donation);
        await _db.SaveChangesAsync();

        return Created("", new
        {
            donationId     = donation.DonationId,
            supporterId    = donation.SupporterId,
            donationType   = donation.DonationType,
            donationDate   = donation.DonationDate,
            isRecurring    = donation.IsRecurring,
            campaignName   = donation.CampaignName,
            channelSource  = donation.ChannelSource,
            currencyCode   = donation.CurrencyCode,
            amount         = donation.Amount,
            estimatedValue = donation.EstimatedValue,
            impactUnit     = donation.ImpactUnit,
            notes          = donation.Notes,
        });
    }
}

public record SubmitDonationRequest(
    string  DonationType,
    decimal? Amount,
    string? CampaignName,
    string  ChannelSource,
    bool    IsRecurring,
    string? Notes,
    string? CurrencyCode);
