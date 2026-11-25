using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using System.ComponentModel.DataAnnotations;

namespace Web_barkery1.Models
{
    public class StockAdjustmentViewModel
    {
        [Range(1, int.MaxValue)]
        public int ProductId { get; set; }

        [ValidateNever]
        public string ProductName { get; set; } = string.Empty;

        public int CurrentStock { get; set; }

        // true: xuất, false: nhập
        public bool IsExport { get; set; }

        [Range(1, int.MaxValue,
            ErrorMessage = "Số lượng phải là số nguyên lớn hơn 0.")]
        public int Quantity { get; set; }
    }
}
