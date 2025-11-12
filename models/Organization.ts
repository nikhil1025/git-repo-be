import mongoose, { Document, Schema } from "mongoose";

export interface IOrganization extends Document {
  integrationId: mongoose.Types.ObjectId;
  githubId: number;
  login: string;
  name?: string;
  description?: string;
  html_url?: string;
  avatar_url?: string;
  type?: string;
  created_at?: Date;
  updated_at?: Date;
  public_repos?: number;
  followers?: number;
  following?: number;
}

const OrganizationSchema: Schema = new Schema(
  {
    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
    },
    githubId: {
      type: Number,
      required: true,
      unique: true,
    },
    login: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    html_url: {
      type: String,
    },
    avatar_url: {
      type: String,
    },
    type: {
      type: String,
    },
    created_at: {
      type: Date,
    },
    updated_at: {
      type: Date,
    },
    public_repos: {
      type: Number,
    },
    followers: {
      type: Number,
    },
    following: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// indexing fields (githubId unique index is already defined in schema)
OrganizationSchema.index({ integrationId: 1 });
OrganizationSchema.index({ login: "text", name: "text", description: "text" }); // Text index for search
OrganizationSchema.index({ login: 1 });

export default mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema
);
