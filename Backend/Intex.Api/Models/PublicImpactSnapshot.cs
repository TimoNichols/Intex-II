using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Intex.Api.Models;

[Table("public_impact_snapshots")]
public class PublicImpactSnapshot
{
    [Key]
    public int SnapshotId { get; set; }
    public DateOnly? SnapshotDate { get; set; }
    public string? Headline { get; set; }
    public string? SummaryText { get; set; }

    [Column(TypeName = "jsonb")]
    public string? MetricPayloadJson { get; set; }

    public bool? IsPublished { get; set; }
    public DateOnly? PublishedAt { get; set; }
}
