let cartCache=[];
async function fetchCart(){
  if(!requireAuth())return [];
  const result=await api.get("/cart");cartCache=result.data;return cartCache;
}
function cartTotal(cart){return cart.reduce((sum,item)=>sum+item.price*item.quantity,0);}
async function renderCart(){
  const wrap=document.getElementById("cart-list");if(!wrap)return;
  if(!requireAuth())return;
  try{
    wrap.innerHTML=`<div class="empty-state">Đang tải giỏ hàng...</div>`;
    const cart=await fetchCart();
    if(!cart.length){wrap.innerHTML=`<div class="empty-state"><h3>Giỏ hàng đang trống</h3><p>Hãy chọn một chiếc bánh thật ngon nhé.</p><a class="btn btn--primary" href="${BASE}pages/products.html">Khám phá sản phẩm</a></div>`;updateSummary(cart);return;}
    wrap.innerHTML=cart.map(item=>`<div class="cart-item">
      <img src="${item.image}" alt="${item.name}"><div><h3>${item.name}</h3><p>${formatVND(item.price)}</p></div>
      <div class="qty"><button onclick="changeQty(${item.id},-1)">−</button><span>${item.quantity}</span><button onclick="changeQty(${item.id},1)">+</button></div>
      <button class="remove" onclick="removeItem(${item.id})">Xóa</button>
    </div>`).join("");
    updateSummary(cart);
  }catch(e){wrap.innerHTML=`<div class="empty-state">${e.message}</div>`;}
}
async function changeQty(id,d){
  try{
    const item=cartCache.find(x=>x.id===id);if(!item)return;
    await api.put("/cart/"+id,{quantity:item.quantity+d});
    await renderCart();await updateCartCount();
  }catch(e){showToast(e.message)}
}
async function removeItem(id){
  try{await api.delete("/cart/"+id);await renderCart();await updateCartCount();showToast("Đã xóa sản phẩm");}catch(e){showToast(e.message)}
}
async function clearCart(){
  try{await api.delete("/cart");await renderCart();await updateCartCount();}catch(e){showToast(e.message)}
}
function updateSummary(cart=cartCache){
  const total=cartTotal(cart);
  document.getElementById("subtotal")&&(document.getElementById("subtotal").textContent=formatVND(total));
  document.getElementById("total")&&(document.getElementById("total").textContent=formatVND(total));
}
document.addEventListener("DOMContentLoaded",renderCart);
window.changeQty=changeQty;window.removeItem=removeItem;window.clearCart=clearCart;window.fetchCart=fetchCart;window.cartTotal=cartTotal;
