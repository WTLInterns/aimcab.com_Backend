const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Set strictQuery to avoid deprecation warnings (optional but recommended)
    mongoose.set("strictQuery", false);
  
    await mongoose.connect(process.env.DB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1); // Exit process on failure
  }
};

module.exports = connectDB;
