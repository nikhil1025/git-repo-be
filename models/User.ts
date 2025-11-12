import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  integrationId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  githubId: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  html_url?: string;
  type?: string;
  site_admin?: boolean;
  company?: string;
  blog?: string;
  location?: string;
  bio?: string;
  public_repos?: number;
  public_gists?: number;
  followers?: number;
  following?: number;
  created_at?: Date;
  updated_at?: Date;
}

const UserSchema: Schema = new Schema(
  {
    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
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
    email: {
      type: String,
    },
    avatar_url: {
      type: String,
    },
    html_url: {
      type: String,
    },
    type: {
      type: String,
    },
    site_admin: {
      type: Boolean,
    },
    company: {
      type: String,
    },
    blog: {
      type: String,
    },
    location: {
      type: String,
    },
    bio: {
      type: String,
    },
    public_repos: {
      type: Number,
    },
    public_gists: {
      type: Number,
    },
    followers: {
      type: Number,
    },
    following: {
      type: Number,
    },
    created_at: {
      type: Date,
    },
    updated_at: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// indexing fields
UserSchema.index({ integrationId: 1 });
UserSchema.index({ organizationId: 1 });
UserSchema.index({ integrationId: 1, organizationId: 1 });
UserSchema.index({ login: "text", name: "text", bio: "text" }); // Text index for search
UserSchema.index({ login: 1 });
UserSchema.index({ email: 1 });

export default mongoose.model<IUser>("User", UserSchema);
