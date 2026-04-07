using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

[Table("intervention_plans")]
public class InterventionPlan
{
    [Key]
    public int PlanId { get; set; }
    public int? ResidentId { get; set; }
    public string? PlanCategory { get; set; }
    public string? PlanDescription { get; set; }
    public string? ServicesProvided { get; set; }
    public decimal? TargetValue { get; set; }
    public DateOnly? TargetDate { get; set; }
    public string? Status { get; set; }
    public DateOnly? CaseConferenceDate { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
