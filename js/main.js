const BASE = location.pathname.includes("/pages/") ? "../" : "./";

document.addEventListener("DOMContentLoaded", async ()=>{
  await loadPart("header","components/header.html");
  await loadPart("footer","components/footer.html");
  setupNav(); await updateCartCount(); setupSearch(); setupMobileNav(); markRole();
});

async function loadPart(id,file){
  const el=document.getElementById(id); if(!el)return;
  try{
    const res=await fetch(BASE+file);
    if(!res.ok) throw new Error(res.status);
    const html=await res.text();
    el.innerHTML=html.replaceAll("{{BASE}}",BASE);
  }catch(e){console.warn("Không tải được component:",file,e)}
}
function setupNav(){
  const page=document.body.dataset.page;
  document.querySelectorAll("[data-nav]").forEach(a=>a.classList.toggle("active",a.dataset.nav===page));
  document.querySelector(".search-toggle")?.addEventListener("click",()=>{
    document.querySelector(".search-panel")?.classList.toggle("open");
    document.getElementById("global-search")?.focus();
  });
  document.querySelector(".menu-toggle")?.addEventListener("click",()=>{
    document.querySelector(".desktop-nav")?.classList.toggle("mobile-open");
  });
}
function setupSearch(){
  const input=document.getElementById("global-search");
  input?.addEventListener("keydown",e=>{
    if(e.key==="Enter" && input.value.trim()){
      location.href=BASE+"pages/products.html?search="+encodeURIComponent(input.value.trim());
    }
  });
}
function setupMobileNav(){
  const nav=document.getElementById("mobile-nav"); if(!nav)return;
  nav.innerHTML=`<div class="mobile-nav">
    <a href="${BASE}index.html">⌂<span>Trang chủ</span></a>
    <a href="${BASE}pages/products.html">▦<span>Danh mục</span></a>
    <a href="${BASE}pages/cart.html">🛒<span>Giỏ hàng</span></a>
    <a href="${BASE}pages/order-tracking.html">◷<span>Đơn hàng</span></a>
    <a href="${BASE}pages/account.html">◯<span>Tài khoản</span></a>
  </div>`;
}
async function updateCartCount(){
  const els=document.querySelectorAll(".cart-count");
  if(!els.length)return;
  if(!localStorage.getItem("bakery_token")){els.forEach(el=>el.textContent="0");return;}
  try{
    const result=await api.get("/cart");
    const count=result.data.reduce((sum,item)=>sum+item.quantity,0);
    els.forEach(el=>el.textContent=count);
  }catch{els.forEach(el=>el.textContent="0");}
}
async function addToCart(id,qty=1){
  if(!localStorage.getItem("bakery_token")){
    showToast("Bạn cần đăng nhập để thêm vào giỏ hàng.");
    setTimeout(()=>location.href=BASE+"pages/login.html",700);
    return;
  }
  try{
    await api.post("/cart",{product_id:Number(id),quantity:Number(qty)});
    await updateCartCount();
    showToast("✓ Đã thêm vào giỏ hàng");
  }catch(e){showToast(e.message)}
}
function showToast(msg){
  const t=document.getElementById("toast"); if(!t)return;
  t.textContent=msg; t.classList.add("show"); clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>t.classList.remove("show"),2600);
}
function markRole(){
  const role=localStorage.getItem("bakery_role");
  document.querySelectorAll("[data-role-badge]").forEach(x=>x.textContent=role==="ADMIN"?"CHỦ QUẦY":role==="STAFF"?"NHÂN VIÊN":"KHÁCH HÀNG");
}
window.BASE=BASE; window.updateCartCount=updateCartCount; window.addToCart=addToCart; window.showToast=showToast; window.formatVND=formatVND;
