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
    static string Hash(string s) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(s)));
    object OrderDto(ShopOrder o, string? token = null) => new
    {
        id = o.Id,
        code = o.Code,
        customer_name = o.CustomerName,
        customer_phone = o.CustomerPhone,
        shipping_address = o.ShippingAddress,
        payment_method = o.PaymentMethod,
        status = o.Status,
        total_amount = o.TotalAmount,
        created_at = DateTime.SpecifyKind(o.CreatedAt, DateTimeKind.Utc),
        completed_at = o.CompletedAt,
        cancellation_reason = o.CancellationReason,
        cancelled_at = o.CancelledAt,
        item_count = o.Items.Count,
        guest_tracking_token = token,
        items = o.Items.Select(x => new { id = x.Id, product_id = x.ProductId, product_name = x.ProductName, price = x.Price, quantity = x.Quantity })
    };
    [HttpPost("orders")]
    public async Task<IActionResult> Order(JsonElement j)
    {
        var o = new ShopOrder
        {
            CustomerName = Text(j, "customer_name", 100),
            CustomerPhone = Text(j, "customer_phone", 15),
            ShippingAddress = Text(j, "shipping_address", 300),
            PaymentMethod = Text(j, "payment_method", 10)
        };
        if (!Regex.IsMatch(o.CustomerPhone, @"^[+0-9 ]{9,15}$"))
            throw new ShopInputException("Số điện thoại không hợp lệ.");
        if (o.PaymentMethod is not ("COD" or "BANK"))
            throw new ShopInputException("Phương thức thanh toán không hợp lệ.");
        var guest = User.Identity?.IsAuthenticated != true;
        string? token = null;
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        List<(int Id, int Quantity)> items;
        if (guest)
        {
            if (!j.TryGetProperty("items", out var arr) || arr.ValueKind != JsonValueKind.Array || arr.GetArrayLength() < 1 || arr.GetArrayLength() > 50)
                throw new ShopInputException("Giỏ hàng cần có từ 1 đến 50 loại bánh.");
            items = arr.EnumerateArray().Select(x => (Int(x, "product_id", 1, int.MaxValue), Int(x, "quantity"))).ToList();
            token = Guid.NewGuid().ToString();
            o.GuestTokenHash = Hash(token);
        }
        else
        {
            o.UserId = Uid;
            items = (await db.ShopCartItems.Where(x => x.UserId == Uid).ToListAsync()).Select(x => (x.ProductId, x.Quantity)).ToList();
        }

        if (items.Count == 0 || items.Count > 50 || items.Select(x => x.Id).Distinct().Count() != items.Count)
            throw new ShopInputException("Giỏ hàng trống, quá lớn hoặc có sản phẩm trùng.");
        foreach (var item in items.OrderBy(x => x.Id))
        {
            var p = await db.Products.AsNoTracking().FirstOrDefaultAsync(x => x.Id == item.Id);
            if (p == null || item.Quantity < 1 || item.Quantity > 999)
                throw new ShopInputException("Sản phẩm hoặc số lượng không hợp lệ.");
            var remaining = item.Quantity;
            var orderItem = new ShopOrderItem { ProductId = p.Id, ProductName = p.Name, Price = p.Price, Quantity = item.Quantity };
            var batches = await db.StockBatches.Where(x => x.ProductId == p.Id && x.Quantity > 0 && x.ExpiryDate >= VietnamToday)
                .OrderBy(x => x.ExpiryDate).ThenBy(x => x.Id).ToListAsync();
            foreach (var batch in batches)
            {
                var take = Math.Min(batch.Quantity, remaining);
                batch.Quantity -= take;
                remaining -= take;
                db.OrderBatchAllocations.Add(new OrderBatchAllocation { ShopOrderItem = orderItem, StockBatch = batch, Quantity = take });
                if (remaining == 0) break;
            }
            if (remaining != 0) throw new ShopInputException($"{p.Name} không đủ bánh còn hạn sử dụng.");
            var changed = await db.Products.Where(x => x.Id == item.Id && x.Stock >= item.Quantity).ExecuteUpdateAsync(s => s.SetProperty(x => x.Stock, x => x.Stock - item.Quantity));
            if (changed != 1) throw new ShopInputException($"{p.Name} không đủ tồn kho.");
            o.Items.Add(orderItem);
            o.TotalAmount += p.Price * item.Quantity;
        }

        db.ShopOrders.Add(o);
        await db.SaveChangesAsync();
        if (!guest)
            await db.ShopCartItems.Where(x => x.UserId == Uid).ExecuteDeleteAsync();
        await tx.CommitAsync();
        return Good(OrderDto(o, token));
    }

    [Authorize, HttpGet("orders")]
    public async Task<IActionResult> Orders() => Good((await db.ShopOrders.Include(x => x.Items).Where(x => Operator || x.UserId == Uid).OrderByDescending(x => x.Id).ToListAsync()).Select(x => OrderDto(x)));
    [Authorize, HttpGet("orders/{id:int}")]
    public async Task<IActionResult> OrderDetail(int id)
    {
        var o = await db.ShopOrders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id && (Operator || x.UserId == Uid));
        return o == null ? NotFound() : Good(OrderDto(o));
    }

    [HttpGet("orders/guest/{token}")]
    public async Task<IActionResult> Guest(string token)
    {
        if (!Guid.TryParse(token, out _))
            return NotFound();
        var hash = Hash(token);
        var o = await db.ShopOrders.Include(x => x.Items).FirstOrDefaultAsync(x => x.UserId == null && x.GuestTokenHash == hash);
        return o == null ? NotFound() : Good(OrderDto(o));
    }

    [Authorize(Roles = "ADMIN,STAFF"), HttpPut("orders/{id:int}/status")]
    public async Task<IActionResult> Status(int id, JsonElement j)
    {
        var next = Text(j, "status", 20);
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        var o = await db.ShopOrders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
        if (o == null)
            return NotFound();
        var allowed = o.Status switch
        {
            "PENDING" => new[]
            {
                "CONFIRMED",
                "CANCELLED"
            },
            "CONFIRMED" => new[]
            {
                "PROCESSING",
                "CANCELLED"
            },
            "PROCESSING" => new[]
            {
                "SHIPPING",
                "CANCELLED"
            },
            "SHIPPING" => new[]
            {
                "COMPLETED"
            },
            _ => Array.Empty<string>()};
        if (!allowed.Contains(next))
            throw new ShopInputException("Không thể chuyển trạng thái này. Hãy tải lại đơn hàng.");
        if (next == "CANCELLED")
        {
            var reason = Text(j, "cancellation_reason", 500);
            if (reason.Length < 10) throw new ShopInputException("Lý do hủy phải có ít nhất 10 ký tự.");
            o.CancellationReason = reason;
            o.CancelledAt = DateTime.UtcNow;
            o.CancelledByUserId = Uid;
            foreach (var item in o.Items.OrderBy(x => x.ProductId))
            {
                var allocations = await db.OrderBatchAllocations.Where(x => x.ShopOrderItemId == item.Id).Include(x => x.StockBatch).ToListAsync();
                foreach (var allocation in allocations) allocation.StockBatch.Quantity += allocation.Quantity;
                var n = await db.Products.Where(x => x.Id == item.ProductId && x.Stock <= int.MaxValue - item.Quantity).ExecuteUpdateAsync(s => s.SetProperty(x => x.Stock, x => x.Stock + item.Quantity));
                if (n != 1)
                    throw new ShopInputException("Không thể hoàn tồn kho. Liên hệ chủ quầy.");
            }
        }

        o.Status = next;
        if (next == "COMPLETED")
            o.CompletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return Good(OrderDto(o));
    }
}
