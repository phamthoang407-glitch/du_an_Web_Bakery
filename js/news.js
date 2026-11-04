document.addEventListener("DOMContentLoaded",async()=>{
  const grid=document.getElementById("news-grid");if(!grid)return;
  try{
    grid.innerHTML='<div class="empty-state">Đang tải tin tức...</div>';
    const news=(await api.get("/news")).data;
    grid.innerHTML=news.map(n=>`<article class="article-card"><img src="${n.image}" alt="${n.title}"><div class="article-card__body"><span class="article-card__meta">${n.category} • ${n.date}</span><h2>${n.title}</h2><p>${n.description}</p><a class="text-link" style="display:inline-block;margin-top:14px" href="#">Đọc thêm →</a></div></article>`).join("");
  }catch(e){grid.innerHTML=`<div class="empty-state">${e.message}</div>`;}
});
