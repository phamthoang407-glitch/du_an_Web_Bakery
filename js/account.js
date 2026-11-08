document.addEventListener("DOMContentLoaded",async()=>{
  if(!requireAuth())return;
  try{
    const user=(await api.get("/auth/me")).data;
    document.querySelector(".profile-head h2").textContent=user.full_name;
    document.querySelector(".profile-head p").textContent=`${user.role==="CUSTOMER"?"Khách hàng":"Tài khoản quản trị"} • Thành viên từ ${new Date(user.created_at).getFullYear()}`;
    const inputs=document.querySelectorAll(".form-grid input");
    if(inputs[0])inputs[0].value=user.full_name||"";
    if(inputs[1])inputs[1].value=user.phone||"";
    if(inputs[2])inputs[2].value=user.email||"";
    if(inputs[3])inputs[3].value=user.address||"";
    document.querySelector(".account-content .btn")?.addEventListener("click",()=>showToast("Thông tin sẽ được cập nhật qua API khi endpoint hồ sơ được bật."));
    const logout=document.querySelector('.account-menu a[style*="red"]');
    logout?.addEventListener("click",async e=>{e.preventDefault();try{await api.post("/auth/logout",{});}catch{}clearAuth();location.href=BASE+"index.html";});
  }catch(e){showToast(e.message)}
});
