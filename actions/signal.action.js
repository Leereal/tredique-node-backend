import mongoose from "mongoose";

export async function getAllSignals() {
  try {
    const collection = mongoose.connection.db.collection("signals");

    const signals = await collection.find({ isActive: true }).toArray();

    // You can handle the results as needed
    return signals;
  } catch (error) {
    console.error("Error retrieving signals:", error);
    // Handle the error appropriately
  }
}

// UPDATE
export async function updateSignal(id, data) {
  try {
    const collection = mongoose.connection.db.collection("signals");

    const filter = { _id: id };
    const update = { $set: data };

    const options = { returnDocument: "after" }; // Equivalent to { new: true }
    const updatedSignal = await collection.findOneAndUpdate(
      filter,
      update,
      options
    );
    return updatedSignal;
  } catch (error) {
    console.error("Error updating signal:", error);
    // Handle the error appropriately
  }
}

export async function createSignal(data) {
  try {
    const collection = mongoose.connection.db.collection("signals");

    // Insert a new document into the collection
    const result = await collection.insertOne(data);

    // `result` contains useful information about the operation
    // For example, `result.insertedId` gives you the _id of the inserted document
    if (result.acknowledged) {
      // If the insert is acknowledged, fetch the newly created document to return it
      const newSignal = await collection.findOne({ _id: result.insertedId });
      return newSignal;
    } else {
      // Handle the case where insert was not acknowledged
      console.error("Signal creation not acknowledged");
    }
  } catch (error) {
    console.error("Error creating new signal:", error);
    // Handle the error appropriately
  }
}

export async function findSignalCategoryByName(categoryName) {
  try {
    const collection = mongoose.connection.db.collection("signalCategories");

    const signalCategory = await collection.findOne({ name: categoryName });

    if (!signalCategory) {
      console.log("No signal category found with the given name");
      return null; // Or handle as needed
    }

    return signalCategory;
  } catch (error) {
    console.error("Error finding signal category by name:", error);
    // Handle the error appropriately
  }
}
