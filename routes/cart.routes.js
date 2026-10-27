const router=require("express").Router();const c=require("../controllers/cart.controller");const {authenticate}=require("../middleware/auth.middleware");
router.use(authenticate);router.get("/",c.get);router.post("/",c.add);router.put("/:id",c.update);router.delete("/:id",c.remove);router.delete("/",c.clear);module.exports=router;
