using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Web_barkery1.Models
{
    public class ProductCreateViewModel
    {
        [Required(ErrorMessage = "Vui lòng nhập tên bánh.")]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [StringLength(2000)]
        public string? Description { get; set; }

        [Range(typeof(decimal), "0.01", "999999999", ParseLimitsInInvariantCulture = true,
            ErrorMessage = "Giá bánh phải lớn hơn 0.")]
        public decimal Price { get; set; }

        [StringLength(500)]
        public string? ImageUrl { get; set; }

        [Range(1, int.MaxValue,
            ErrorMessage = "Vui lòng chọn danh mục.")]
        public int CategoryId { get; set; }

        [ValidateNever]
        public List<SelectListItem> Categories { get; set; } = new();
    }
}
