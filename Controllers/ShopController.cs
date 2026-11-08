using Microsoft.AspNetCore.Mvc;

namespace Web_barkery1.Controllers;
public class ShopController : Controller
{
    [HttpGet("/")]
    [HttpGet("/index.html")]
    public IActionResult Index() => View("index");
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
