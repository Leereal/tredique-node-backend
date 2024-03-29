import Connection from "../database/models/connection.model.js";
import Account from "../database/models/account.model.js";

export async function getAllConnections(robotId) {
  try {
    const connections = await Connection.find({
      active: true,
      robot: robotId,
    })
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

export async function getConnectionById(connectionId) {
  try {
    const connection = await Connection.findOne({
      _id: connectionId,
      active: true,
    })
      .populate({
        path: "account",
        model: Account,
        select: "_id account_name balance token",
      })
      .exec();

    return connection;
  } catch (error) {
    console.error("Error retrieving connection:", error);
    // Handle the error appropriately
  }
}

// UPDATE
export async function updateConnection(robotConnection, data) {
  try {
    const updatedConnection = await Connection.findByIdAndUpdate(
      robotConnection._id,
      data,
      { new: true }
    );
    return updatedConnection;
  } catch (error) {
    console.log(error);
  }
}
