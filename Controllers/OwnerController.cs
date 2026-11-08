using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Web_barkery1.Controllers
{
    [Authorize(Roles = "ADMIN")]
    public class OwnerController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}