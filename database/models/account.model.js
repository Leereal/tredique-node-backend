import mongoose from "mongoose";

const AccountSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  account_name: { type: String },
  token: { type: String },
  active: { type: Boolean },
  balance: { type: Number },
  opening_balance: { type: Number },
});

const Account =
  mongoose.models.Account || mongoose.model("Account", AccountSchema);

export default Account;
