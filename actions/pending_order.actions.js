import mongoose from "mongoose";

export async function createPendingOrder(data) {
  try {
    const collection = mongoose.connection.db.collection("pending_orders");
    const result = await collection.insertOne(data);
    console.log("Pending order created successfully:", result);
  } catch (error) {
    console.error("Error creating pending order:", error);
    // Handle the error appropriately
  }
}
