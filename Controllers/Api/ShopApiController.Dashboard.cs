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
    [Authorize(Roles = "ADMIN"), HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        var today = DateTime.UtcNow.AddHours(7).Date;
        var start = today.AddHours(-7);
        var week = start.AddDays(-6);
        var end = start.AddDays(1);
        var done = await db.ShopOrders.Include(x => x.Items).Where(x => x.Status == "COMPLETED" && x.CompletedAt >= week && x.CompletedAt < end).ToListAsync();
        var td = done.Where(x => x.CompletedAt >= start).ToList();
        var recent = await db.ShopOrders.Include(x => x.Items).OrderByDescending(x => x.Id).Take(8).ToListAsync();
        return Good(new { revenue_today = td.Sum(x => x.TotalAmount), completed_today = td.Count, orders_today = await db.ShopOrders.CountAsync(x => x.CreatedAt >= start && x.CreatedAt < end), customers = (await users.GetUsersInRoleAsync("CUSTOMER")).Count, products = await db.Products.CountAsync(), recent_orders = recent.Select(x => OrderDto(x)), best_products = done.SelectMany(x => x.Items).GroupBy(x => new { x.ProductId, x.ProductName }).Select(g => new { product_id = g.Key.ProductId, product_name = g.Key.ProductName, sold = g.Sum(x => x.Quantity), price = g.Max(x => x.Price) }).OrderByDescending(x => x.sold).Take(5), revenue_7_days = done.GroupBy(x => x.CompletedAt!.Value.AddHours(7).ToString("yyyy-MM-dd")).Select(g => new { day = g.Key, total = g.Sum(x => x.TotalAmount) }) });
    }
}
