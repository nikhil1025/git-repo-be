import mongoose, { Document, Schema } from "mongoose";

export interface IIssueChangelog extends Document {
  integrationId: mongoose.Types.ObjectId;
  repositoryId: mongoose.Types.ObjectId;
  issueId: mongoose.Types.ObjectId;
  githubEventId?: number;
  event?: string;
  created_at?: Date;
  actor?: {
    login: string;
    id: number;
  };
  label?: {
    name: string;
    color: string;
  };
  assignee?: {
    login: string;
    id: number;
  };
  rename?: {
    from: string;
    to: string;
  };
  commit_id?: string;
  commit_url?: string;
}

const IssueChangelogSchema: Schema = new Schema(
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
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
    },
    githubEventId: {
      type: Number,
    },
    event: {
      type: String,
    },
    created_at: {
      type: Date,
    },
    actor: {
      login: { type: String },
      id: { type: Number },
    },
    label: {
      name: { type: String },
      color: { type: String },
    },
    assignee: {
      login: { type: String },
      id: { type: Number },
    },
    rename: {
      from: { type: String },
      to: { type: String },
    },
    commit_id: {
      type: String,
    },
    commit_url: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// indexing fields
IssueChangelogSchema.index({ integrationId: 1 });
IssueChangelogSchema.index({ repositoryId: 1 });
IssueChangelogSchema.index({ issueId: 1 });
IssueChangelogSchema.index({ integrationId: 1, repositoryId: 1, issueId: 1 });
IssueChangelogSchema.index({ event: 1 });
IssueChangelogSchema.index({ "actor.login": 1 });
IssueChangelogSchema.index({ created_at: -1 }); // Sort by date

export default mongoose.model<IIssueChangelog>(
  "IssueChangelog",
  IssueChangelogSchema
);
