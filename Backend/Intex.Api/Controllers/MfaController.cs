using System.Security.Claims;
using System.Text;
using Intex.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

/// <summary>
/// Endpoints for managing TOTP-based multi-factor authentication for the
/// currently signed-in user. All endpoints require a valid JWT.
/// </summary>
[ApiController]
[Route("api/mfa")]
[Authorize]
public class MfaController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;

    public MfaController(UserManager<ApplicationUser> users) => _users = users;

    // -----------------------------------------------------------------------
    // GET /api/mfa/status
    // -----------------------------------------------------------------------

    /// <summary>Returns whether TOTP MFA is currently enabled for the caller.</summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var user = await CurrentUser();
        if (user is null) return NotFound();
        return Ok(new { enabled = user.TwoFactorEnabled });
    }

    // -----------------------------------------------------------------------
    // GET /api/mfa/setup
    // -----------------------------------------------------------------------

    /// <summary>
    /// Returns the TOTP authenticator URI and formatted base-32 key so the
    /// client can render a QR code or display the manual-entry key.
    /// Calling this endpoint generates a new authenticator key if one does
    /// not yet exist; it does NOT enable 2FA — that requires a separate
    /// <c>POST /api/mfa/enable</c> with a verified code.
    /// </summary>
    [HttpGet("setup")]
    public async Task<IActionResult> GetSetup()
    {
        var user = await CurrentUser();
        if (user is null) return NotFound();

        // Retrieve the existing authenticator key or generate a fresh one.
        var rawKey = await _users.GetAuthenticatorKeyAsync(user);
        if (string.IsNullOrEmpty(rawKey))
        {
            await _users.ResetAuthenticatorKeyAsync(user);
            rawKey = await _users.GetAuthenticatorKeyAsync(user);
        }

        if (string.IsNullOrEmpty(rawKey))
            return StatusCode(500, new { message = "Could not generate authenticator key." });

        // The key from Identity is already a base-32 string.  Space it into
        // 4-character groups so it is readable when shown as a fallback.
        var formattedKey = FormatKey(rawKey);

        const string appName = "Harbor of Hope";
        var accountName = user.Email ?? user.UserName ?? "user";

        var uri = BuildOtpAuthUri(appName, accountName, rawKey);

        return Ok(new { uri, key = formattedKey });
    }

    // -----------------------------------------------------------------------
    // POST /api/mfa/enable
    // -----------------------------------------------------------------------

    /// <summary>
    /// Verifies the supplied TOTP code against the user's current authenticator
    /// key and, if valid, permanently enables 2FA on the account.
    /// </summary>
    [HttpPost("enable")]
    public async Task<IActionResult> Enable([FromBody] MfaCodeRequest request)
    {
        var user = await CurrentUser();
        if (user is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Code))
            return BadRequest(new { message = "A 6-digit code is required." });

        var code  = request.Code.Replace(" ", "").Trim();
        var valid = await _users.VerifyTwoFactorTokenAsync(
            user, TokenOptions.DefaultAuthenticatorProvider, code);

        if (!valid)
            return BadRequest(new
            {
                message = "Incorrect code — check your authenticator app and try again. " +
                          "Make sure your device clock is accurate."
            });

        await _users.SetTwoFactorEnabledAsync(user, true);
        return Ok(new { enabled = true });
    }

    // -----------------------------------------------------------------------
    // POST /api/mfa/disable
    // -----------------------------------------------------------------------

    /// <summary>
    /// Disables TOTP MFA on the account and resets the authenticator key so
    /// the old QR code can no longer be used to generate valid codes.
    /// </summary>
    [HttpPost("disable")]
    public async Task<IActionResult> Disable()
    {
        var user = await CurrentUser();
        if (user is null) return NotFound();

        await _users.SetTwoFactorEnabledAsync(user, false);
        await _users.ResetAuthenticatorKeyAsync(user);
        return Ok(new { enabled = false });
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private async Task<ApplicationUser?> CurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(userId) ? null : await _users.FindByIdAsync(userId);
    }

    /// <summary>Inserts a space every 4 characters for readability.</summary>
    private static string FormatKey(string key)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < key.Length; i++)
        {
            if (i > 0 && i % 4 == 0) sb.Append(' ');
            sb.Append(char.ToUpperInvariant(key[i]));
        }
        return sb.ToString();
    }

    private static string BuildOtpAuthUri(string issuer, string account, string secret) =>
        $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(account)}" +
        $"?secret={secret.ToUpperInvariant()}" +
        $"&issuer={Uri.EscapeDataString(issuer)}" +
        $"&algorithm=SHA1&digits=6&period=30";
}

public record MfaCodeRequest(string Code);
