const express = require("express");
const cors = require("cors");

const accountRoutes = require("./routes/account.routes");
const transactionRoutes = require("./routes/transaction.routes");

const errorHandler = require("./middleware/error.middleware");

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Transaction Ledger API is running"
  });
});

app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);

app.use(errorHandler);

module.exports = app;