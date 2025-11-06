import cors from "cors";
import dotenv from "dotenv";
import express, { Application, NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
dotenv.config();

import authRoutes from "./routes/auth";
import dataRoutes from "./routes/data";
import githubRoutes from "./routes/github";
import integrationRoutes from "./routes/integration";

const app: Application = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/integrations";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:4200";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Type"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/integration", integrationRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/data", dataRoutes);

app.use((req: Request, res: Response) => {
  res
    .status(404)
    .json({ error: "Not Found", message: `Route ${req.url} not found` });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// shuts down the server and MongoDB connection when the app is stopped.
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    mongoose.connection.close(false).then(() => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    mongoose.connection.close(false).then(() => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
});

export default app;
