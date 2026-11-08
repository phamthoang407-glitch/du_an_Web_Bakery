const STATUS_LABEL={PENDING:"Chờ xác nhận",CONFIRMED:"Đã xác nhận",PROCESSING:"Đang chuẩn bị",SHIPPING:"Đang giao",COMPLETED:"Hoàn thành",CANCELLED:"Đã hủy"};
function statusClass(s){return s==="SHIPPING"?"status--ship":s==="COMPLETED"?"status--done":"status--wait";}
async function updateOrder(btn,id,currentStatus){
  const next={PENDING:"CONFIRMED",CONFIRMED:"PROCESSING",PROCESSING:"SHIPPING",SHIPPING:"COMPLETED"}[currentStatus];
  if(!next)return;
  btn.disabled=true;btn.textContent="Đang xử lý...";
  try{await api.put("/orders/"+id+"/status",{status:next});showToast("✓ Đã cập nhật đơn hàng");await renderStaffOrders();}catch(e){showToast(e.message);btn.disabled=false;}
}
async function renderOwnerDashboard(){
  if(!requireRole("ADMIN")) return;
  try{
    const data=(await api.get("/dashboard")).data;
    const stats=document.querySelectorAll(".admin-stat strong");
    if(stats[0])stats[0].textContent=formatVND(data.revenue_today);
    if(stats[1])stats[1].textContent=data.orders_today;
    if(stats[2])stats[2].textContent=data.customers.toLocaleString("vi-VN");
    const avg=data.orders_today?Math.round(data.revenue_today/data.orders_today):0;
    if(stats[3])stats[3].textContent=formatVND(avg);
    const rank=document.querySelector(".rank-list");
    if(rank)rank.innerHTML=data.best_products.slice(0,3).map((p,i)=>`<div><span class="rank">0${i+1}</span><p><b>${p.product_name}</b><small>${p.sold} sản phẩm đã bán</small></p><strong>${Math.round(p.price/1000)}k</strong></div>`).join("");
    const tbody=document.querySelector("#orders tbody");
    if(tbody)tbody.innerHTML=data.recent_orders.slice(0,6).map(o=>`<tr><td><b>${o.code}</b></td><td>${o.customer_name}</td><td>${new Date(o.created_at).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</td><td><b>${formatVND(o.total_amount)}</b></td><td><span class="status ${statusClass(o.status)}">${STATUS_LABEL[o.status]}</span></td><td><button class="mini-btn">Chi tiết</button></td></tr>`).join("");
  }catch(e){showToast(e.message)}
}
async function renderStaffOrders(){
  if(!requireRole("STAFF")) return;
  const tbody=document.querySelector(".staff-dashboard #orders tbody");if(!tbody)return;
  try{
    const data=(await api.get("/orders")).data;
    tbody.innerHTML=data.map(o=>`<tr><td><b>${o.code}</b><small class="cell-sub">${new Date(o.created_at).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</small></td><td>${o.customer_name}</td><td>${o.item_count||"-"} sản phẩm</td><td><b>${formatVND(o.total_amount)}</b></td><td><span class="status ${statusClass(o.status)}">${STATUS_LABEL[o.status]}</span></td><td>${["PENDING","CONFIRMED","PROCESSING","SHIPPING"].includes(o.status)?`<button class="action-btn" onclick="updateOrder(this,${o.id},'${o.status}')">${o.status==="PENDING"?"Xác nhận":o.status==="CONFIRMED"?"Bắt đầu chuẩn bị":o.status==="PROCESSING"?"Bắt đầu giao":"Hoàn tất"}</button>`:`<button class="mini-btn">Chi tiết</button>`}</td></tr>`).join("");
    const stats=document.querySelectorAll(".staff-stats .admin-stat strong");
    if(stats.length){
      stats[0].textContent=data.filter(x=>x.status==="PENDING").length;
      stats[1].textContent=data.filter(x=>x.status==="PROCESSING").length;
      stats[2].textContent=data.filter(x=>x.status==="COMPLETED").length;
    }
  }catch(e){showToast(e.message)}
}
document.addEventListener("DOMContentLoaded",async()=>{
  if(!requireAuth())return;
  if(document.body.classList.contains("staff-dashboard")) await renderStaffOrders();
  if(document.body.classList.contains("admin-body")&&!document.body.classList.contains("staff-dashboard")) await renderOwnerDashboard();
});
window.updateOrder=updateOrder;window.renderStaffOrders=renderStaffOrders;
