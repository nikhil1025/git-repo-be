#!/usr/bin/env node
// Comprehensive script to fix MongoDB index and data issues
// Run with: node scripts/fix-all.js

const mongoose = require("mongoose");
require("dotenv").config();

// Update with your MongoDB connection string from .env or use default
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/integrations";

async function main() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const collection = db.collection("repositories");

    // Step 1: Drop the problematic text index
    console.log("Step 1: Fixing text index...");
    try {
      const indexes = await collection.indexes();
      const textIndex = indexes.find(
        (i) => i.name.includes("text") || i.key._fts === "text"
      );

      if (textIndex) {
        console.log(`  Dropping old text index: ${textIndex.name}`);
        await collection.dropIndex(textIndex.name);
        console.log("  ✅ Old text index dropped successfully");
      } else {
        console.log("  ℹ️  No text index found to drop");
      }
    } catch (error) {
      console.log(`  ⚠️  Could not drop index: ${error.message}`);
    }

    // Step 2: Fix null values in string fields
    console.log("\nStep 2: Fixing null values in documents...");
    try {
      const result = await collection.updateMany(
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

      console.log(`  ✅ Updated ${result.modifiedCount} documents`);
    } catch (error) {
      console.log(`  ⚠️  Error updating documents: ${error.message}`);
    }

    // Step 3: Show current state
    console.log("\nStep 3: Current database state...");
    const count = await collection.countDocuments();
    console.log(`  Total repositories: ${count}`);

    const indexes = await collection.indexes();
    console.log(`  Current indexes: ${indexes.map((i) => i.name).join(", ")}`);

    console.log("\n✅ All fixes applied successfully!");
    console.log(
      "ℹ️  New text index will be created automatically when you restart the app\n"
    );

    await mongoose.connection.close();
    console.log("Connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
