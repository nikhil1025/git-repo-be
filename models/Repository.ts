import mongoose, { Document, Schema } from "mongoose";

export interface IRepository extends Document {
  integrationId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  githubId: number;
  name: string;
  full_name?: string;
  description?: string;
  html_url?: string;
  private?: boolean;
  fork?: boolean;
  created_at?: Date;
  updated_at?: Date;
  pushed_at?: Date;
  size?: number;
  stargazers_count?: number;
  watchers_count?: number;
  language?: string;
  forks_count?: number;
  open_issues_count?: number;
  default_branch?: string;
  owner?: {
    login: string;
    id: number;
    type: string;
  };
}

const RepositorySchema: Schema = new Schema(
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
    name: {
      type: String,
      required: true,
    },
    full_name: {
      type: String,
    },
    description: {
      type: String,
    },
    html_url: {
      type: String,
    },
    private: {
      type: Boolean,
    },
    fork: {
      type: Boolean,
    },
    created_at: {
      type: Date,
    },
    updated_at: {
      type: Date,
    },
    pushed_at: {
      type: Date,
    },
    size: {
      type: Number,
    },
    stargazers_count: {
      type: Number,
    },
    watchers_count: {
      type: Number,
    },
    language: {
      type: String,
    },
    forks_count: {
      type: Number,
    },
    open_issues_count: {
      type: Number,
    },
    default_branch: {
      type: String,
    },
    owner: {
      login: { type: String },
      id: { type: Number },
      type: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// indexing fields (githubId unique index is already defined in schema)
RepositorySchema.index({ integrationId: 1 });
RepositorySchema.index({ organizationId: 1 });
RepositorySchema.index({ integrationId: 1, organizationId: 1 });
RepositorySchema.index({
  name: "text",
  full_name: "text",
  description: "text",
});
RepositorySchema.index({ language: 1 });
RepositorySchema.index({ "owner.login": 1 });

export default mongoose.model<IRepository>("Repository", RepositorySchema);
