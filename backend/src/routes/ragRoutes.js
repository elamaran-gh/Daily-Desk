const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { indexEntry, askJournal } = require("../controllers/ragController");

router.post("/index", authMiddleware, indexEntry);
router.post("/ask", authMiddleware, askJournal);

module.exports = router;
