using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

[Table("supporters")]
public class Supporter
{
    public int SupporterId { get; set; }
    public string? SupporterType { get; set; }
    public string? DisplayName { get; set; }
    public string? OrganizationName { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? RelationshipType { get; set; }
    public string? Region { get; set; }
    public string? Country { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? Status { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    public DateOnly? FirstDonationDate { get; set; }
    public string? AcquisitionChannel { get; set; }
}
