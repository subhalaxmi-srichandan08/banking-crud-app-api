
const express = require("express");
const { body } = require("express-validator");

const {
  createAccount,
  getBalance,
  getAccounts,
} = require("../controllers/account.controller");

const {
  getTransactions,
} = require("../controllers/transaction.controller");

const validate = require("../middleware/validation.middleware");

const router = express.Router();


// Create account
router.post(
  "/",
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Account name is required")
      .isLength({ max: 100 })
      .withMessage(
        "Account name cannot exceed 100 characters"
      ),
  ],
  validate,
  createAccount
);


// Get all accounts
router.get(
  "/",
  getAccounts
);


// Get balance
router.get(
  "/:accountId/balance",
  getBalance
);


// Get transaction history
router.get(
  "/:accountId/transactions",
  getTransactions
);


module.exports = router;
