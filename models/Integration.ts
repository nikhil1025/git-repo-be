import mongoose, { Document, Schema } from "mongoose";

export interface IIntegration extends Document {
  userId: string;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  connectedAt: Date;
  lastSyncedAt?: Date;
  status: "active" | "disconnected";
  githubUser: {
    id: number;
    login: string;
    name?: string;
    email?: string;
    avatar_url?: string;
    html_url?: string;
  };
}

const IntegrationSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      default: "github",
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
    },
    tokenType: {
      type: String,
    },
    scope: {
      type: String,
    },
    connectedAt: {
      type: Date,
      default: Date.now,
    },
    lastSyncedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "disconnected"],
      default: "active",
    },
    githubUser: {
      id: { type: Number },
      login: { type: String },
      name: { type: String },
      email: { type: String },
      avatar_url: { type: String },
      html_url: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// indexing fields
IntegrationSchema.index({ userId: 1, provider: 1 });

export default mongoose.model<IIntegration>("Integration", IntegrationSchema);
