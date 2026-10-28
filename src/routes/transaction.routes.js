const express = require("express");
const { body } = require("express-validator");

const {
    createTransaction,
    getTransactions,
    transfer,
} = require("../controllers/transaction.controller");

const validate = require("../middleware/validation.middleware");

const router = express.Router();


// Create transaction
router.post(
    "/",
    [
        body("account_id")
            .isMongoId()
            .withMessage("Valid account_id is required"),

        body("type")
            .isIn(["credit", "debit"])
            .withMessage("Type must be credit or debit"),

        body("amount")
            .isFloat({ gt: 0 })
            .withMessage("Amount must be greater than 0")
            .toFloat(),

        body("description")
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage(
                "Description cannot exceed 500 characters"
            ),
    ],
    validate,
    createTransaction
);

router.post(
    "/transfer",
    [
        body("source_account_id")
            .isMongoId()
            .withMessage(
                "Valid source_account_id is required"
            ),

        body("destination_account_id")
            .isMongoId()
            .withMessage(
                "Valid destination_account_id is required"
            ),

        body("amount")
            .isFloat({ gt: 0 })
            .withMessage(
                "Amount must be greater than 0"
            )
            .toFloat(),

        body("description")
            .optional()
            .trim()
            .isLength({ max: 500 })
            .withMessage(
                "Description cannot exceed 500 characters"
            ),
    ],
    validate,
    transfer
);


module.exports = router;