const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    account_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    reference_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

transactionSchema.index({
  account_id: 1,
  created_at: -1,
});

module.exports = mongoose.model("Transaction", transactionSchema);