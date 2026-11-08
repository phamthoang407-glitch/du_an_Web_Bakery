using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace Web_barkery1.Models;
public class ShopOrder
{
    public int Id { get; set; }

    [MaxLength(40)]
    public string Code { get; set; } = "BK-" + Guid.NewGuid().ToString("N");

    [MaxLength(450)]
    public string? UserId { get; set; }

    [MaxLength(64)]
    public string? GuestTokenHash { get; set; }

    [MaxLength(100)]
    public string CustomerName { get; set; } = "";

    [MaxLength(15)]
    public string CustomerPhone { get; set; } = "";

    [MaxLength(300)]
    public string ShippingAddress { get; set; } = "";

    [MaxLength(10)]
    public string PaymentMethod { get; set; } = "COD";

    [MaxLength(20)]
    public string Status { get; set; } = "PENDING";

    [Precision(18, 2)]
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public List<ShopOrderItem> Items { get; set; } = new();
}

public class ShopOrderItem
{
    public int Id { get; set; }
    public int ShopOrderId { get; set; }
    public int ProductId { get; set; }

    [MaxLength(150)]
    public string ProductName { get; set; } = "";

    [Precision(18, 2)]
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}

public class ShopCartItem
{
    public int Id { get; set; }

    [MaxLength(450)]
    public string UserId { get; set; } = "";
    public int ProductId { get; set; }
    public int Quantity { get; set; }
}
