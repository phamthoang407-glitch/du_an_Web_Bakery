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
public class ShopInputException(string message) : Exception(message);
public class ShopErrorsAttribute : ExceptionFilterAttribute
{
    public override void OnException(ExceptionContext c)
    {
        if (c.Exception is ShopInputException or DbUpdateException)
        {
            c.Result = new ObjectResult(new { success = false, message = c.Exception is ShopInputException ? c.Exception.Message : "Dữ liệu đã thay đổi hoặc đang được sử dụng. Hãy tải lại và thử lại." })
            {
                StatusCode = c.Exception is ShopInputException ? 400 : 409
            };
            c.ExceptionHandled = true;
        }
    }
}

[ApiController, Route("api"), ShopErrors]
public partial class ShopApiController(BakeryDbContext db, UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn) : ControllerBase
{
    string Uid => users.GetUserId(User) ?? throw new ShopInputException("Bạn cần đăng nhập.");

    bool Operator => User.IsInRole("ADMIN") || User.IsInRole("STAFF");

    IActionResult Good(object? data = null) => Ok(new { success = true, data });
    static string Text(JsonElement j, string key, int max = 300, bool required = true)
    {
        var s = j.ValueKind == JsonValueKind.Object && j.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString()?.Trim() ?? "" : "";
        if ((required && s.Length == 0) || s.Length > max)
            throw new ShopInputException($"Thông tin {key} còn thiếu hoặc quá dài (tối đa {max}).");
        return s;
    }

    static string Password(JsonElement j)
    {
        if (j.ValueKind != JsonValueKind.Object || !j.TryGetProperty("password", out var v) || v.ValueKind != JsonValueKind.String || string.IsNullOrEmpty(v.GetString()) || v.GetString()!.Length > 200)
            throw new ShopInputException("Vui lòng nhập mật khẩu (tối đa 200 ký tự).");
        return v.GetString()!;
    }

    static int Int(JsonElement j, string key, int min = 1, int max = 999)
    {
        if (j.ValueKind != JsonValueKind.Object || !j.TryGetProperty(key, out var v) || v.ValueKind != JsonValueKind.Number || !v.TryGetInt32(out var n) || n < min || n > max)
            throw new ShopInputException($"{key} phải là số nguyên từ {min} đến {max}.");
        return n;
    }

    static decimal Money(JsonElement j, string key, decimal min = 0, decimal max = 999999999)
    {
        if (j.ValueKind != JsonValueKind.Object || !j.TryGetProperty(key, out var v) || v.ValueKind != JsonValueKind.Number || !v.TryGetDecimal(out var n) || n < min || n > max)
            throw new ShopInputException($"Giá trị {key} không hợp lệ.");
        return decimal.Round(n, 2);
    }

    static string Image(JsonElement j)
    {
        var s = Text(j, "image", 500, false);
        if (s.Length > 0 && !(s.StartsWith("/images/") && !s.Contains("..") && !s.Contains('\\')) && !(Uri.TryCreate(s, UriKind.Absolute, out var u) && (u.Scheme == "http" || u.Scheme == "https")))
            throw new ShopInputException("Ảnh phải là URL http/https hoặc đường dẫn /images/.");
        return s;
    }

    async Task<object> PublicUser(ApplicationUser u)
    {
        var roles = await users.GetRolesAsync(u);
        return new
        {
            id = u.Id,
            full_name = u.FullName,
            email = u.Email,
            phone = u.PhoneNumber,
            address = u.Address,
            role = roles.Contains("ADMIN") ? "ADMIN" : roles.Contains("STAFF") ? "STAFF" : "CUSTOMER"
        };
    }

    static void Check(IdentityResult r)
    {
        if (!r.Succeeded)
            throw new ShopInputException(string.Join("; ", r.Errors.Select(x => x.Description)));
    }
}
