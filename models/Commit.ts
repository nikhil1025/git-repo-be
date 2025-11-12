import mongoose, { Document, Schema } from "mongoose";

export interface ICommit extends Document {
  integrationId: mongoose.Types.ObjectId;
  repositoryId: mongoose.Types.ObjectId;
  sha: string;
  message?: string;
  author?: {
    name: string;
    email: string;
    date: Date;
  };
  committer?: {
    name: string;
    email: string;
    date: Date;
  };
  html_url?: string;
  parents?: Array<{ sha: string }>;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

const CommitSchema: Schema = new Schema(
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
    sha: {
      type: String,
      required: true,
      unique: true,
    },
    message: {
      type: String,
    },
    author: {
      name: { type: String },
      email: { type: String },
      date: { type: Date },
    },
    committer: {
      name: { type: String },
      email: { type: String },
      date: { type: Date },
    },
    html_url: {
      type: String,
    },
    parents: [
      {
        sha: { type: String },
      },
    ],
    stats: {
      additions: { type: Number },
      deletions: { type: Number },
      total: { type: Number },
    },
  },
  {
    timestamps: true,
  }
);

// indexing fields
CommitSchema.index({ integrationId: 1 });
CommitSchema.index({ repositoryId: 1 });
CommitSchema.index({ integrationId: 1, repositoryId: 1 });
CommitSchema.index({ message: "text" }); // Text index for search
CommitSchema.index({ "author.email": 1 });
CommitSchema.index({ "author.name": 1 });

export default mongoose.model<ICommit>("Commit", CommitSchema);
