using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using System.Globalization;
using System.Text.RegularExpressions;
using Web_barkery1.Models;
using Web_barkery1.data;

namespace Web_barkery1.Controllers;
public partial class ShopApiController
{
    [Authorize(Roles = "ADMIN"), HttpGet("users/staff")]
    public async Task<IActionResult> Staff()
    {
        var staff = await users.GetUsersInRoleAsync("STAFF");
        return Good(staff.Where(x => x.LockoutEnd == null || x.LockoutEnd < DateTimeOffset.UtcNow).Select(x => new { id = x.Id, full_name = x.FullName, email = x.Email, phone = x.PhoneNumber }));
    }

    [Authorize(Roles = "ADMIN"), HttpPost("users/staff")]
    public async Task<IActionResult> CreateStaff(JsonElement j)
    {
        var email = Text(j, "email", 256);
        var u = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = Text(j, "full_name", 100)
        };
        await using var tx = await db.Database.BeginTransactionAsync();
        Check(await users.CreateAsync(u, Password(j)));
        Check(await users.AddToRoleAsync(u, "STAFF"));
        await tx.CommitAsync();
        return Good();
    }

    [Authorize(Roles = "ADMIN"), HttpDelete("users/{id}")]
    public async Task<IActionResult> DisableStaff(string id)
    {
        var u = await users.FindByIdAsync(id);
        if (u == null)
            return NotFound();
        var roles = await users.GetRolesAsync(u);
        if (roles.Count != 1 || !roles.Contains("STAFF"))
            return Forbid();
        Check(await users.SetLockoutEnabledAsync(u, true));
        Check(await users.SetLockoutEndDateAsync(u, DateTimeOffset.MaxValue));
        Check(await users.UpdateSecurityStampAsync(u));
        return Good();
    }
}
