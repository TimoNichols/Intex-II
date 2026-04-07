using Intex.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Api.Controllers;

/// <summary>
/// Manages resident / case management data.
///
/// Role matrix:
///   GET    → Admin + Staff  (read access for case workers)
///   POST   → Admin only     (Staff cannot create records)
///   PUT    → Admin only
///   PATCH  → Admin only
///   DELETE → Admin only     (Staff can never delete)
/// </summary>
[ApiController]
[Route("api/cases")]
public class CaseController : ControllerBase
{
    private readonly AppDbContext _db;

    public CaseController(AppDbContext db)
    {
        _db = db;
    }

    // -----------------------------------------------------------------------
    // GET — Admin + Staff
    // -----------------------------------------------------------------------

    /// <summary>Returns all case records.</summary>
    [Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleStaff}")]
    [HttpGet]
    public IActionResult GetCases()
    {
        // TODO: replace with real DbSet query once CaseRecord model is added
        return Ok(Array.Empty<object>());
    }

    /// <summary>Returns a single case record by ID.</summary>
    [Authorize(Roles = $"{DatabaseSeeder.RoleAdmin},{DatabaseSeeder.RoleStaff}")]
    [HttpGet("{id:int}")]
    public IActionResult GetCase(int id)
    {
        // TODO: look up case by id
        return NotFound();
    }

    // -----------------------------------------------------------------------
    // POST — Admin only
    // -----------------------------------------------------------------------

    /// <summary>Creates a new case record.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpPost]
    public IActionResult CreateCase([FromBody] object request)
    {
        // TODO: implement once CaseRecord model exists
        return StatusCode(501);
    }

    // -----------------------------------------------------------------------
    // PUT / PATCH — Admin only
    // -----------------------------------------------------------------------

    /// <summary>Replaces a case record.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpPut("{id:int}")]
    public IActionResult ReplaceCase(int id, [FromBody] object request)
    {
        return StatusCode(501);
    }

    /// <summary>Partially updates a case record.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpPatch("{id:int}")]
    public IActionResult PatchCase(int id, [FromBody] object request)
    {
        return StatusCode(501);
    }

    // -----------------------------------------------------------------------
    // DELETE — Admin only
    // -----------------------------------------------------------------------

    /// <summary>Deletes a case record.</summary>
    [Authorize(Roles = DatabaseSeeder.RoleAdmin)]
    [HttpDelete("{id:int}")]
    public IActionResult DeleteCase(int id)
    {
        return StatusCode(501);
    }
}
