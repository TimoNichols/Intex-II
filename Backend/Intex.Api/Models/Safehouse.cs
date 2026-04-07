using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

[Table("safehouses")]
public class Safehouse
{
    public int SafehouseId { get; set; }
    public string SafehouseCode { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string? City { get; set; }
    public string? Province { get; set; }
    public string? Country { get; set; }
    public DateOnly? OpenDate { get; set; }
    public string? Status { get; set; }
    public int? CapacityGirls { get; set; }
    public int? CapacityStaff { get; set; }
    public int? CurrentOccupancy { get; set; }
    public string? Notes { get; set; }
}
