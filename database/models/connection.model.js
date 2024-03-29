import mongoose from "mongoose";

const ConnectionSchema = new mongoose.Schema(
  {
    connector: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    robot: { type: mongoose.Schema.Types.ObjectId, ref: "Robot" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    payout: { type: Number },
    stake: { type: Number },
    expiration: { type: Number },
    current_level: { type: Number },
    martingale: { type: Boolean },
    target_percentage: { type: Number },
    active: { type: Boolean },
    target_reached: { type: Boolean },
    open_trade: { type: Boolean },
    active_contract_id: { type: Number },
    last_profit: { type: Number },
    entry: { type: String },
    currency: { type: String },
    dynamic_stake: { type: Boolean },
  },
  {
    timestamps: true, // This option adds 'createdAt' and 'updatedAt' fields
  }
);

const Connection =
  mongoose.models.Connection || mongoose.model("Connection", ConnectionSchema);

export default Connection;
