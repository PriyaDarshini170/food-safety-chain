const mongoose = require("mongoose");

const ROLES = ["ADMIN", "FARMER", "PROCESSOR", "DISTRIBUTOR", "RETAILER", "CUSTOMER"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    location: { type: String, default: "" },
    wallet: { type: String, required: true, lowercase: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
module.exports.ROLES = ROLES;
