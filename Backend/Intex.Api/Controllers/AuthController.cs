using System.Security.Claims;
using Intex.Api.Data;
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
    private readonly AppDbContext _db;

    public AuthController(UserManager<ApplicationUser> users, JwtService jwt, AppDbContext db)
    {
        _users = users;
        _jwt   = jwt;
        _db    = db;
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

    // -----------------------------------------------------------------------
    // POST /api/auth/register
    // -----------------------------------------------------------------------

    /// <summary>
    /// Public self-registration for donors. Creates a Supporter record,
    /// an Identity account assigned the Donor role, and returns a signed JWT
    /// so the caller is immediately logged in.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { message = "Email and password are required." });

        if (await _users.FindByEmailAsync(request.Email) is not null)
            return Conflict(new { message = "An account with that email already exists. Please log in." });

        // Create a Supporter record so the donor portal has something to show.
        var supporter = new Supporter
        {
            FirstName          = request.FirstName?.Trim(),
            LastName           = request.LastName?.Trim(),
            Email              = request.Email.Trim().ToLowerInvariant(),
            Status             = "Active",
            AcquisitionChannel = "Web",
            CreatedAt          = DateTimeOffset.UtcNow,
        };
        _db.Supporters.Add(supporter);
        await _db.SaveChangesAsync();

        var displayName = $"{request.FirstName} {request.LastName}".Trim();

        var user = new ApplicationUser
        {
            UserName       = request.Email,
            Email          = request.Email,
            DisplayName    = string.IsNullOrWhiteSpace(displayName) ? null : displayName,
            EmailConfirmed = true,
            SupporterId    = supporter.SupporterId,
        };

        var result = await _users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { message = string.Join(" ", result.Errors.Select(e => e.Description)) });

        await _users.AddToRoleAsync(user, DatabaseSeeder.RoleDonor);

        var roles = await _users.GetRolesAsync(user);
        var token = _jwt.GenerateToken(user, roles);

        return Ok(new LoginResponse(
            Token:       token,
            ExpiresIn:   8 * 3600,
            Email:       user.Email!,
            DisplayName: user.DisplayName ?? user.Email!,
            Roles:       roles));
    }
}

// ---------------------------------------------------------------------------
// Request / response models
// ---------------------------------------------------------------------------

public record LoginRequest(string Email, string Password);

public record RegisterRequest(string Email, string Password, string? FirstName, string? LastName);

public record LoginResponse(
    string       Token,
    int          ExpiresIn,
    string       Email,
    string       DisplayName,
    IList<string> Roles);
