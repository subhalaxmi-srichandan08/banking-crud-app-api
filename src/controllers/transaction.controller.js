const mongoose = require("mongoose");

const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const ApiError = require("../utils/apiError");

// Generate a unique reference ID
const generateReferenceId = () => {
  return `TXN-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
};

// Create transaction
const createTransaction = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const {
      account_id,
      type,
      amount,
      description,
    } = req.body;

    const transactionAmount = Number(amount);

    if (!mongoose.Types.ObjectId.isValid(account_id)) {
      throw new ApiError(400, "Invalid account ID");
    }

    session.startTransaction();

    // Check account
    const account = await Account.findById(account_id).session(session);

    if (!account) {
      throw new ApiError(404, "Account not found");
    }

    let updatedAccount;

    // Credit
    if (type === "credit") {
      updatedAccount = await Account.findOneAndUpdate(
        { _id: account_id },
        {
          $inc: {
            balance: transactionAmount,
          },
        },
        {
          new: true,
          session,
        }
      );
    }

    // Debit
    else if (type === "debit") {
      updatedAccount = await Account.findOneAndUpdate(
        {
          _id: account_id,
          balance: {
            $gte: transactionAmount,
          },
        },
        {
          $inc: {
            balance: -transactionAmount,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!updatedAccount) {
        throw new ApiError(400, "Insufficient balance");
      }
    }

    // Invalid type
    else {
      throw new ApiError(
        400,
        "Transaction type must be credit or debit"
      );
    }

    // Generate reference ID on backend
    const referenceId = generateReferenceId();

    // Create transaction
    const transaction = await Transaction.create(
      [
        {
          account_id,
          type,
          amount: transactionAmount,
          description: description?.trim() || "",
          reference_id: referenceId,
        },
      ],
      {
        session,
      }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: {
        transaction: transaction[0],
        balance: updatedAccount.balance,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    if (error.code === 11000) {
      return next(
        new ApiError(
          409,
          "Transaction reference ID already exists"
        )
      );
    }

    next(error);
  } finally {
    await session.endSession();
  }
};


// Get transaction history
const getTransactions = async (req, res, next) => {
  try {
    const { accountId } = req.params;

    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const type = req.query.type;

    // Check account
    const account = await Account.findById(accountId);

    if (!account) {
      throw new ApiError(404, "Account not found");
    }

    const filter = {
      account_id: accountId,
    };

    if (type) {
      if (!["credit", "debit"].includes(type)) {
        throw new ApiError(
          400,
          "Type must be credit or debit"
        );
      }

      filter.type = type;
    }

    const totalRecords =
      await Transaction.countDocuments(filter);

    const transactions = await Transaction.find(filter)
      .sort({
        created_at: -1,
      })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalPages =
      Math.ceil(totalRecords / limit);

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          current_page: page,
          page_size: limit,
          total_records: totalRecords,
          total_pages: totalPages,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
const transfer = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const {
      source_account_id,
      destination_account_id,
      amount,
      description,
    } = req.body;

    const transferAmount = Number(amount);

    if (
      !mongoose.Types.ObjectId.isValid(
        source_account_id
      )
    ) {
      throw new ApiError(
        400,
        "Invalid source account ID"
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        destination_account_id
      )
    ) {
      throw new ApiError(
        400,
        "Invalid destination account ID"
      );
    }

    if (
      source_account_id ===
      destination_account_id
    ) {
      throw new ApiError(
        400,
        "Source and destination accounts must be different"
      );
    }

    session.startTransaction();

    // Check both accounts exist
    const accounts = await Account.find({
      _id: {
        $in: [
          source_account_id,
          destination_account_id,
        ],
      },
    }).session(session);

    if (accounts.length !== 2) {
      throw new ApiError(
        404,
        "Source or destination account not found"
      );
    }

    /*
     * Debit source account.
     *
     * The balance condition makes this atomic:
     * debit only happens when sufficient balance exists.
     */
    const sourceAccount =
      await Account.findOneAndUpdate(
        {
          _id: source_account_id,
          balance: {
            $gte: transferAmount,
          },
        },
        {
          $inc: {
            balance: -transferAmount,
          },
        },
        {
          new: true,
          session,
        }
      );

    if (!sourceAccount) {
      throw new ApiError(
        400,
        "Insufficient balance"
      );
    }

    // Credit destination account
    const destinationAccount =
      await Account.findOneAndUpdate(
        {
          _id: destination_account_id,
        },
        {
          $inc: {
            balance: transferAmount,
          },
        },
        {
          new: true,
          session,
        }
      );

    if (!destinationAccount) {
      throw new ApiError(
        404,
        "Destination account not found"
      );
    }

    // Create debit transaction
    const debitReferenceId =
      generateReferenceId();

    const debitTransaction =
      await Transaction.create(
        [
          {
            account_id: source_account_id,
            type: "debit",
            amount: transferAmount,
            description:
              description?.trim() ||
              "Transfer to account",
            reference_id:
              debitReferenceId,
          },
        ],
        {
          session,
        }
      );

    // Create credit transaction
    const creditReferenceId =
      generateReferenceId();

    const creditTransaction =
      await Transaction.create(
        [
          {
            account_id:
              destination_account_id,
            type: "credit",
            amount: transferAmount,
            description:
              description?.trim() ||
              "Transfer from account",
            reference_id:
              creditReferenceId,
          },
        ],
        {
          session,
        }
      );

    /*
     * Nothing is permanently saved until
     * the transaction is committed.
     */
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Transfer completed successfully",
      data: {
        debit_transaction:
          debitTransaction[0],

        credit_transaction:
          creditTransaction[0],

        source_balance:
          sourceAccount.balance,

        destination_balance:
          destinationAccount.balance,
      },
    });
  } catch (error) {
    /*
     * If anything fails:
     *
     * - source debit is rolled back
     * - destination credit is rolled back
     * - debit transaction is rolled back
     * - credit transaction is rolled back
     */
    await session.abortTransaction();

    next(error);
  } finally {
    await session.endSession();
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  transfer,
};