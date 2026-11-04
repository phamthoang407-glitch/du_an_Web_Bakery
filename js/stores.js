async function renderStores(){
  const list=document.getElementById("store-list");if(!list)return;
  try{
    const stores=(await api.get("/stores")).data;
    list.innerHTML=stores.map((s,i)=>`<div class="store-card ${i===0?"active":""}" onclick="selectStore(${s.id})"><h3>${s.name}</h3><p>${s.address}</p><p>${s.distance} • ${s.opening_time}</p><small>● Đang mở cửa</small></div>`).join("");
    window.storeData=stores;
    if(stores[0])document.getElementById("map-label").textContent=stores[0].name+" • "+stores[0].address;
  }catch(e){list.innerHTML=`<div class="empty-state">${e.message}</div>`;}
}
function selectStore(id){
  const s=(window.storeData||[]).find(x=>x.id===id);if(!s)return;
  document.querySelectorAll(".store-card").forEach(x=>x.classList.remove("active"));
  event?.currentTarget?.classList.add("active");
  document.getElementById("map-label").textContent=s.name+" • "+s.address;
}
document.addEventListener("DOMContentLoaded",renderStores);window.selectStore=selectStore;
