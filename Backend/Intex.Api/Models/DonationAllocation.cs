using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

[Table("donation_allocations")]
public class DonationAllocation
{
    [Key]
    public int AllocationId { get; set; }
    public int? DonationId { get; set; }
    public int? SafehouseId { get; set; }
    public string? ProgramArea { get; set; }
    public decimal? AmountAllocated { get; set; }
    public DateOnly? AllocationDate { get; set; }
    public string? AllocationNotes { get; set; }
}
