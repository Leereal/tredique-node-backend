import mongoose from "mongoose";

export default function connectDB() {
  const url = process.env.MONGODB_URI;

  try {
    mongoose.connect(url, {
      dbName: "tredique",
    });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  const dbConnection = mongoose.connection;
  dbConnection.once("open", (_) => {
    console.log(`Database connected successfully`);
  });

  dbConnection.on("error", (err) => {
    console.error(`connection error: ${err}`);
  });
  return;
}
