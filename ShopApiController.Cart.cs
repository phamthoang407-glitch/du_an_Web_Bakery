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
    [Authorize, HttpGet("cart")]
    public async Task<IActionResult> Cart() => Good(await (
        from c in db.ShopCartItems
        join p in db.Products on c.ProductId equals p.Id
        where c.UserId == Uid
        select new { id = c.Id, product_id = p.Id, name = p.Name, price = p.Price, image = p.ImageUrl ?? "/images/cake-placeholder.svg", quantity = c.Quantity }).ToListAsync());
    [Authorize, HttpPost("cart")]
    public async Task<IActionResult> AddCart(JsonElement j)
    {
        var id = Int(j, "product_id", 1, int.MaxValue);
        var n = Int(j, "quantity");
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var p = await db.Products.FindAsync(id);
        if (p == null)
            return NotFound();
        var c = await db.ShopCartItems.FirstOrDefaultAsync(x => x.UserId == Uid && x.ProductId == id);
        var sellable = await db.StockBatches.Where(x => x.ProductId == id && x.ExpiryDate >= VietnamToday).SumAsync(x => x.Quantity);
        if (n + (c?.Quantity ?? 0) > 999 || n + (c?.Quantity ?? 0) > sellable)
            throw new ShopInputException("Số lượng vượt tồn kho hoặc giới hạn 999.");
        if (c == null)
        {
            c = new ShopCartItem
            {
                UserId = Uid,
                ProductId = id
            };
            db.ShopCartItems.Add(c);
        }

        c.Quantity += n;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return Good();
    }

    [Authorize, HttpPut("cart/{id:int}")]
    public async Task<IActionResult> ChangeCart(int id, JsonElement j)
    {
        var n = Int(j, "quantity", 0);
        var c = await db.ShopCartItems.FirstOrDefaultAsync(x => x.Id == id && x.UserId == Uid);
        if (c == null)
            return NotFound();
        if (n == 0)
            db.Remove(c);
        else
        {
            var p = await db.Products.FindAsync(c.ProductId);
            var sellable = await db.StockBatches.Where(x => x.ProductId == c.ProductId && x.ExpiryDate >= VietnamToday).SumAsync(x => x.Quantity);
            if (p == null || sellable < n)
                throw new ShopInputException("Không đủ tồn kho.");
            c.Quantity = n;
        }

        await db.SaveChangesAsync();
        return Good();
    }

    [Authorize, HttpDelete("cart"), HttpDelete("cart/{id:int}")]
    public async Task<IActionResult> DeleteCart(int? id = null)
    {
        await db.ShopCartItems.Where(x => x.UserId == Uid && (!id.HasValue || x.Id == id)).ExecuteDeleteAsync();
        return Good();
    }
}
