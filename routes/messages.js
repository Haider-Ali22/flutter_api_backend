const { addMessage, getMessages, updateStatus } = require("../controllers/messageController");
const router = require("express").Router();

router.post("/addmsg/", addMessage);
router.post("/getmsg/", getMessages);
router.post("/status", updateStatus); // update delivered/seen

module.exports = router;
