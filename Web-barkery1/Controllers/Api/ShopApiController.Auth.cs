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
    [HttpPost("auth/login")]
    public async Task<IActionResult> Login(JsonElement j)
    {
        var identifier = Text(j, "identifier", 256);
        var password = Password(j);
        var u = await users.FindByEmailAsync(identifier) ?? await users.Users.FirstOrDefaultAsync(x => x.PhoneNumber == identifier);
        if (u == null)
            return Unauthorized(new { message = "Thông tin đăng nhập không đúng." });
        var r = await signIn.PasswordSignInAsync(u, password, false, true);
        if (!r.Succeeded)
            return Unauthorized(new { message = r.IsLockedOut ? "Tài khoản bị khóa. Vui lòng thử lại sau hoặc liên hệ chủ quầy." : "Thông tin đăng nhập không đúng." });
        return Good(new { user = await PublicUser(u) });
    }

    [HttpPost("auth/register")]
    public async Task<IActionResult> Register(JsonElement j)
    {
        var email = Text(j, "email", 256);
        if (!new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
            throw new ShopInputException("Email không hợp lệ.");
        var u = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = Text(j, "full_name", 100),
            PhoneNumber = Text(j, "phone", 15, false),
            Address = Text(j, "address", 300, false)
        };
        if (!string.IsNullOrEmpty(u.PhoneNumber) && (!Regex.IsMatch(u.PhoneNumber, @"^[+0-9 ]{9,15}$") || await users.Users.AnyAsync(x => x.PhoneNumber == u.PhoneNumber)))
            throw new ShopInputException("Số điện thoại không hợp lệ hoặc đã được sử dụng.");
        await using var tx = await db.Database.BeginTransactionAsync();
        Check(await users.CreateAsync(u, Password(j)));
        Check(await users.AddToRoleAsync(u, "CUSTOMER"));
        await tx.CommitAsync();
        await signIn.SignInAsync(u, false);
        return Good(new { user = await PublicUser(u) });
    }

    [Authorize, HttpPost("auth/logout")]
    public async Task<IActionResult> Logout()
    {
        await signIn.SignOutAsync();
        return Good();
    }

    [Authorize, HttpGet("auth/me")]
    public async Task<IActionResult> Me() => Good(await PublicUser((await users.GetUserAsync(User))!));
    [Authorize, HttpPut("auth/me")]
    public async Task<IActionResult> Profile(JsonElement j)
    {
        var u = (await users.GetUserAsync(User))!;
        u.FullName = Text(j, "full_name", 100);
        u.Address = Text(j, "address", 300, false);
        var phone = Text(j, "phone", 15, false);
        if (phone != "" && (!Regex.IsMatch(phone, @"^[+0-9 ]{9,15}$") || await users.Users.AnyAsync(x => x.Id != u.Id && x.PhoneNumber == phone)))
            throw new ShopInputException("Số điện thoại không hợp lệ hoặc đã được dùng.");
        u.PhoneNumber = phone;
        Check(await users.UpdateAsync(u));
        return Good(await PublicUser(u));
    }
}
