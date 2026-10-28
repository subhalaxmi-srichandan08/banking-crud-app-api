const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const ApiError = require("../utils/apiError");

const createAccount = async (req, res, next) => {
  try {
    const { name } = req.body;

    const account = await Account.create({
      name,
      balance: 0
    });

    return res.status(201).json({
      success: true,
      data: account
    });
  } catch (error) {
    next(error);
  }
};

const getBalance = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      throw new ApiError(400, "Invalid account ID");
    }

    const account = await Account.findById(accountId).select(
      "_id balance"
    );

    if (!account) {
      throw new ApiError(404, "Account not found");
    }

    return res.status(200).json({
      success: true,
      data: {
        account_id: account._id,
        balance: account.balance
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const type = req.query.type;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      throw new ApiError(400, "Invalid account ID");
    }

    if (!Number.isInteger(page) || page < 1) {
      throw new ApiError(400, "Page must be a positive integer");
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ApiError(
        400,
        "Limit must be between 1 and 100"
      );
    }

    if (type && !["credit", "debit"].includes(type)) {
      throw new ApiError(
        400,
        "Type must be either credit or debit"
      );
    }

    const accountExists = await Account.exists({
      _id: accountId
    });

    if (!accountExists) {
      throw new ApiError(404, "Account not found");
    }

    const filter = {
      account_id: accountId
    };

    if (type) {
      filter.type = type;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Transaction.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,

      data: transactions,

      pagination: {
        current_page: page,
        page_size: limit,
        total_records: total,
        total_pages: totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find()
      .sort({
        created_at: -1,
      })
      .select("_id name balance created_at");

    res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAccount,
  getBalance,
  getAccounts,
};