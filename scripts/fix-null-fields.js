// Script to clean up null values in Repository collection
// Run with: node scripts/fix-null-fields.js

const mongoose = require("mongoose");
require("dotenv").config();

// Update with your MongoDB connection string
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/integrations";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Update repositories with null values to undefined
    const result = await mongoose.connection.db
      .collection("repositories")
      .updateMany(
        {
          $or: [
            { description: null },
            { language: null },
            { full_name: null },
            { html_url: null },
            { default_branch: null },
          ],
        },
        {
          $unset: {
            description: "",
            language: "",
            full_name: "",
            html_url: "",
            default_branch: "",
          },
        }
      );

    console.log(`Updated ${result.modifiedCount} documents`);

    await mongoose.connection.close();
    console.log("Connection closed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
