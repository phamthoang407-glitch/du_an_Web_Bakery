using Microsoft.EntityFrameworkCore;
using Web_barkery1.data;
using Web_barkery1.Helpers;
using Microsoft.AspNetCore.Mvc;

namespace Web_barkery1.Controllers;
public class ShopController(BakeryDbContext db) : Controller
{
    [HttpGet("/")]
    [HttpGet("/index.html")]
    public IActionResult Index()
    {
        Response.Headers.CacheControl = "no-store, max-age=0";
        return View("index");
    }
    [HttpGet("/pages/{page}.html")]
    public IActionResult Page(string page)
    {
        var allowed = new[]
        {
            "account",
            "cart",
            "checkout",
            "dashboard-owner",
            "dashboard-staff",
            "dashboard",
            "login",
            "news",
            "order-tracking",
            "product-detail",
            "products",
            "stores",
            "register"
        };
        if (page == "product-detail")
        {
            if (!int.TryParse(Request.Query["id"], out var productId))
                return RedirectPermanent("/san-pham");
            var product = db.Products.AsNoTracking().FirstOrDefault(x => x.Id == productId);
            return product is null ? NotFound() : RedirectPermanent(SeoUrl.Product(product));
        }
        if (!allowed.Contains(page))
            return NotFound();
        if (page == "dashboard")
            return Redirect("/pages/dashboard-owner.html");
        if (page is "dashboard-owner" or "dashboard-staff" or "account")
        {
            if (User.Identity?.IsAuthenticated != true)
                return Challenge();
            if (page == "dashboard-owner" && !User.IsInRole("ADMIN"))
                return Forbid();
            if (page == "dashboard-staff" && !User.IsInRole("STAFF") && !User.IsInRole("ADMIN"))
                return Forbid();
        }

        return View(page);
    }
}
