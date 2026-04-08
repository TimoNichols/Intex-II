using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Intex.Api.Migrations
{
    /// <inheritdoc />
    public partial class LinkUserToSupporter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "supporter_id",
                table: "AspNetUsers",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "supporter_id",
                table: "AspNetUsers");
        }
    }
}
