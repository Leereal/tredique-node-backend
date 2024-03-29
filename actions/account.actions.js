import Connection from "../database/models/connection.model.js";
import Account from "../database/models/account.model.js";

export async function getAllConnections() {
  try {
    const connections = await Connection.find({ active: true })
      // .populate({
      //   path: "connector",
      //   model: User,
      //   select: "_id firstName lastName",
      // })
      // .populate({ path: "category", model: Category, select: "_id name" })
      .populate({
        path: "account",
        model: Account,
        select: "_id account_name balance token",
      })
      // .populate({ path: "robot", model: Robot, select: "_id name version" })
      .exec();
    return connections;
  } catch (error) {
    console.error("Error retrieving connections:", error);
    // Handle the error appropriately
  }
}

// UPDATE
export async function updateAccount(data) {
  try {
    const updatedAccount = await Account.findOneAndUpdate(
      { account_name: data.loginid },
      { balance: data.balance },
      { new: true }
    );
    return updatedAccount;
  } catch (error) {
    console.log(error);
  }
}
