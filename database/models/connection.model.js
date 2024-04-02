import mongoose from "mongoose";

const ConnectionSchema = new mongoose.Schema(
  {
    connector: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    robot: { type: mongoose.Schema.Types.ObjectId, ref: "Robot" },
    payout: { type: Number },
    stake: { type: Number },
    expiration: { type: Number },
    currentLevel: { type: Number },
    martingale: { type: Boolean },
    targetPercentage: { type: Number },
    active: { type: Boolean },
    targetReached: { type: Boolean },
    openTrade: { type: Boolean },
    activeContractId: { type: Number },
    lastProfit: { type: Number },
    entry: { type: String },
    currency: { type: String },
    dynamicStake: { type: Boolean },
  },
  {
    timestamps: true, // This option adds 'createdAt' and 'updatedAt' fields
  }
);

const Connection =
  mongoose.models.Connection || mongoose.model("Connection", ConnectionSchema);

export default Connection;
