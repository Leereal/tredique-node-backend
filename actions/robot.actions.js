import mongoose from "mongoose";

export async function getAllRobot() {
  try {
    const collection = mongoose.connection.db.collection("robots");

    const robots = await collection.find({ active: true }).toArray();

    // You can handle the results as needed
    return robots;
  } catch (error) {
    console.error("Error retrieving connections:", error);
    // Handle the error appropriately
  }
}

// UPDATE
export async function updateRobot(id, data) {
  try {
    const collection = mongoose.connection.db.collection("robots");

    const filter = { _id: id };
    const update = { $set: data };

    const options = { returnDocument: "after" }; // Equivalent to { new: true }
    const updatedRobot = await collection.findOneAndUpdate(
      filter,
      update,
      options
    );
    return updatedRobot;
  } catch (error) {
    console.error("Error updating robot:", error);
    // Handle the error appropriately
  }
}
