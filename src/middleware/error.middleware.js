const mongoose = require("mongoose");

const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message
      }))
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Transaction with this reference_id already exists for this account"
    });
  }

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      error.message || "Internal server error"
  });
};

module.exports = errorHandler;