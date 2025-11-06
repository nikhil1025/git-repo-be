import mongoose, { Document, Schema } from "mongoose";

export interface IIssue extends Document {
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
  user?: {
    login: string;
    id: number;
    avatar_url: string;
  };
  labels?: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  assignees?: Array<{
    login: string;
    id: number;
  }>;
  comments?: number;
  locked?: boolean;
}

const IssueSchema: Schema = new Schema(
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
    user: {
      login: { type: String },
      id: { type: Number },
      avatar_url: { type: String },
    },
    labels: [
      {
        id: { type: Number },
        name: { type: String },
        color: { type: String },
      },
    ],
    assignees: [
      {
        login: { type: String },
        id: { type: Number },
      },
    ],
    comments: {
      type: Number,
    },
    locked: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
  }
);

// indexing fields
IssueSchema.index({ repositoryId: 1, number: 1 }, { unique: true });
IssueSchema.index({ integrationId: 1 });
IssueSchema.index({ repositoryId: 1 });
IssueSchema.index({ githubId: 1 });
IssueSchema.index({ state: 1 });
IssueSchema.index({ title: "text", body: "text" }); // Text index for search
IssueSchema.index({ "user.login": 1 });

export default mongoose.model<IIssue>("Issue", IssueSchema);
