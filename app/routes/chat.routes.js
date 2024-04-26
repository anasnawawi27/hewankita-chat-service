const chatListController = require("../controllers/chat_list.controller");
const router = require("express").Router();

router.get("/", chatListController.findAll);
router.get("/detail", chatListController.find);
router.post("/", chatListController.create);
router.put("/", chatListController.update);
router.put("/seen", chatListController.seen);

module.exports = router;
