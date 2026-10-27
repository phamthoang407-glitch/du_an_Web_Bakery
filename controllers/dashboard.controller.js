const s=require("../services/dashboard.service");
function dashboard(req,res,next){try{res.json({success:true,message:"Success",data:s.get()})}catch(e){next(e)}}
module.exports={dashboard};
