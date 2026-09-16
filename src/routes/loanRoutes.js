const express = require("express");
const loanController = require("../controllers/loanController");

const router = express.Router();

router.get("/", loanController.index);
router.post("/", loanController.create);
router.post("/clear", loanController.clearLoans);
router.patch("/:id/return", loanController.markAsReturned);
router.patch("/:id/extend", loanController.extendLoan);

module.exports = router;
