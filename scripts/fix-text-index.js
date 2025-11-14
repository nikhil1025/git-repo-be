// Script to drop and recreate text index with proper language override setting
// Run with: node scripts/fix-text-index.js

const mongoose = require("mongoose");
require("dotenv").config();

// Update with your MongoDB connection string
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/integrations";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("repositories");

    try {
      // Get existing indexes
      const indexes = await collection.indexes();
      console.log(
        "Current indexes:",
        indexes.map((i) => i.name)
      );

      // Drop the old text index if it exists
      const textIndex = indexes.find(
        (i) => i.name.includes("text") || i.key._fts === "text"
      );
      if (textIndex) {
        console.log(`Dropping old text index: ${textIndex.name}`);
        await collection.dropIndex(textIndex.name);
        console.log("Old text index dropped successfully");
      }

      // The new index will be created automatically when the app starts
      console.log(
        "Text index will be recreated when the app starts with new settings"
      );
    } catch (error) {
      console.error("Error:", error);
    }

    await mongoose.connection.close();
    console.log("Connection closed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Connection error:", err);
    process.exit(1);
  });
