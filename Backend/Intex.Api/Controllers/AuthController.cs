using System.Security.Claims;
using Intex.Api.Models;
using Intex.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly JwtService _jwt;

    public AuthController(UserManager<ApplicationUser> users, JwtService jwt)
    {
        _users = users;
        _jwt   = jwt;
    }

    // -----------------------------------------------------------------------
    // POST /api/auth/login
    // -----------------------------------------------------------------------

    /// <summary>
    /// Authenticates with email + password and returns a signed JWT.
    /// Always returns the same generic error message on failure so callers
    /// cannot determine whether the email or the password was wrong.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Look up the user first — but do NOT reveal whether the email exists.
        var user = await _users.FindByEmailAsync(request.Email);

        // Treat "user not found" identically to "wrong password" to prevent
        // user-enumeration attacks.
        if (user is null)
            return Unauthorized(new { message = "Invalid credentials." });

        // Respect the lockout window set in Program.cs (5 attempts → 15 min lock).
        if (await _users.IsLockedOutAsync(user))
            return StatusCode(423, new { message = "Account is temporarily locked. Try again later." });

        var passwordValid = await _users.CheckPasswordAsync(user, request.Password);

        if (!passwordValid)
        {
            // Increment the failed-access counter; this may trigger a lockout.
            await _users.AccessFailedAsync(user);
            return Unauthorized(new { message = "Invalid credentials." });
        }

        // Successful login — reset the failed-access counter.
        await _users.ResetAccessFailedCountAsync(user);

        var roles = await _users.GetRolesAsync(user);
        var token = _jwt.GenerateToken(user, roles);

        return Ok(new LoginResponse(
            Token:       token,
            ExpiresIn:   8 * 3600,   // seconds — matches the 8-hour token lifetime
            Email:       user.Email!,
            DisplayName: user.DisplayName ?? user.Email!,
            Roles:       roles));
    }

    // -----------------------------------------------------------------------
    // POST /api/auth/logout
    // -----------------------------------------------------------------------

    /// <summary>
    /// Signs the user out.
    ///
    /// JWTs are stateless — the server cannot cryptographically invalidate a
    /// token that has already been issued. The correct client-side behaviour is
    /// to discard the token from storage on receipt of this 204 response.
    ///
    /// If you later need server-side revocation (e.g. "log out all devices"),
    /// implement a token blocklist backed by a fast store such as Redis, keyed
    /// on the JWT "jti" claim which is already embedded in every token.
    /// </summary>
    [Authorize]
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // Nothing server-side to clear for stateless JWTs.
        // The client must delete the token from wherever it stored it.
        return NoContent();
    }

    // -----------------------------------------------------------------------
    // GET /api/auth/me
    // -----------------------------------------------------------------------

    /// <summary>
    /// Returns the current user's identity and roles decoded from their JWT.
    ///
    /// Note on CORS preflight: OPTIONS requests are intercepted by the CORS
    /// middleware and never reach the authorization layer, so [Authorize] here
    /// does not block preflight — no separate [AllowAnonymous] OPTIONS handler
    /// is needed.
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        // Read directly from the JWT claims — no database round-trip needed.
        var userId      = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email       = User.FindFirstValue(ClaimTypes.Email);
        var displayName = User.FindFirstValue(ClaimTypes.Name);
        var roles       = User.FindAll(ClaimTypes.Role)
                              .Select(c => c.Value)
                              .ToList();

        return Ok(new
        {
            userId,
            email,
            displayName,
            roles,
        });
    }
}

// ---------------------------------------------------------------------------
// Request / response models
// ---------------------------------------------------------------------------

public record LoginRequest(string Email, string Password);

public record LoginResponse(
    string       Token,
    int          ExpiresIn,
    string       Email,
    string       DisplayName,
    IList<string> Roles);
