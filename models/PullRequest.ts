import mongoose, { Document, Schema } from "mongoose";

export interface IPullRequest extends Document {
  integrationId: mongoose.Types.ObjectId;
  repositoryId: mongoose.Types.ObjectId;
  githubId: number;
  number: number;
  title?: string;
  state?: string;
  body?: string;
  html_url?: string;
  created_at?: Date;
  updated_at?: Date;
  closed_at?: Date;
  merged_at?: Date;
  user?: {
    login: string;
    id: number;
    avatar_url: string;
  };
  head?: {
    ref: string;
    sha: string;
  };
  base?: {
    ref: string;
    sha: string;
  };
  merged?: boolean;
  mergeable?: boolean;
  comments?: number;
  commits?: number;
  additions?: number;
  deletions?: number;
  changed_files?: number;
}

const PullRequestSchema: Schema = new Schema(
  {
    integrationId: {
      type: Schema.Types.ObjectId,
      ref: "Integration",
      required: true,
    },
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },
    githubId: {
      type: Number,
      required: true,
    },
    number: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
    },
    state: {
      type: String,
    },
    body: {
      type: String,
    },
    html_url: {
      type: String,
    },
    created_at: {
      type: Date,
    },
    updated_at: {
      type: Date,
    },
    closed_at: {
      type: Date,
    },
    merged_at: {
      type: Date,
    },
    user: {
      login: { type: String },
      id: { type: Number },
      avatar_url: { type: String },
    },
    head: {
      ref: { type: String },
      sha: { type: String },
    },
    base: {
      ref: { type: String },
      sha: { type: String },
    },
    merged: {
      type: Boolean,
    },
    mergeable: {
      type: Boolean,
    },
    comments: {
      type: Number,
    },
    commits: {
      type: Number,
    },
    additions: {
      type: Number,
    },
    deletions: {
      type: Number,
    },
    changed_files: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

// indexing fields
PullRequestSchema.index({ repositoryId: 1, number: 1 }, { unique: true });
PullRequestSchema.index({ integrationId: 1 });
PullRequestSchema.index({ repositoryId: 1 });
PullRequestSchema.index({ githubId: 1 });
PullRequestSchema.index({ state: 1 });
PullRequestSchema.index({ merged: 1 });
PullRequestSchema.index({ title: "text", body: "text" });
PullRequestSchema.index({ "user.login": 1 });

export default mongoose.model<IPullRequest>("PullRequest", PullRequestSchema);
