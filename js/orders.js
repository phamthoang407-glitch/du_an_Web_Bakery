async function renderOrderTracking(){
  const id=new URLSearchParams(location.search).get("id");
  try{
    if(!requireAuth())return;
    const orders=(await api.get("/orders")).data;
    const order=id?(await api.get("/orders/"+id)).data:orders[0];
    if(!order){document.querySelector(".tracking-wrap").innerHTML='<div class="empty-state">Chưa có đơn hàng.</div>';return;}
    document.getElementById("order-code").textContent=order.code;
    document.getElementById("order-total").textContent=formatVND(order.total_amount);
    const statusLabel={PENDING:"Chờ xác nhận",CONFIRMED:"Đã xác nhận",PROCESSING:"Đang chuẩn bị",SHIPPING:"Đang giao",COMPLETED:"Đã giao",CANCELLED:"Đã hủy"};
    const head=document.querySelector(".tracking-head .status");
    if(head){head.textContent=statusLabel[order.status]||order.status;head.className="status "+(order.status==="SHIPPING"?"status--ship":order.status==="COMPLETED"?"status--done":"status--wait");}
    const timeline=document.querySelector(".timeline");
    const states=["PENDING","PROCESSING","SHIPPING","COMPLETED"];
    if(timeline){
      const current=states.indexOf(order.status);
      const labels=[["Đã đặt hàng","Đơn hàng đã được tiếp nhận"],["Đang chuẩn bị","Nhân viên đang chuẩn bị bánh"],["Đang giao","Đơn hàng đang được giao"],["Đã giao","Đơn hàng đã hoàn tất"]];
      timeline.innerHTML=labels.map((x,i)=>`<div class="timeline-step ${i<current?"done":i===current?"current":""}"><div class="timeline-dot">${i<current?"✓":i+1}</div><span>${x[0]}</span><small>${i===current?x[1]:""}</small></div>`).join("");
    }
    const table=document.querySelector(".order-info .order-table tbody");
    if(table)table.innerHTML=order.items.map(i=>`<tr><td>${i.product_name}</td><td>${i.quantity}</td><td>${formatVND(i.price*i.quantity)}</td></tr>`).join("");
    const delivery=document.querySelector(".delivery-box");
    if(delivery)delivery.innerHTML=`<strong>Địa chỉ giao hàng</strong>${order.customer_name}<br>${order.shipping_address}<br><br><strong>Số điện thoại</strong>${order.customer_phone}`;
  }catch(e){showToast(e.message)}
}
document.addEventListener("DOMContentLoaded",renderOrderTracking);
