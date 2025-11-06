import { Request, Response } from "express";
import mongoose from "mongoose";
import Commit from "../models/Commit";
import Integration from "../models/Integration";
import Issue from "../models/Issue";
import IssueChangelog from "../models/IssueChangelog";
import Organization from "../models/Organization";
import PullRequest from "../models/PullRequest";
import Repository from "../models/Repository";
import User from "../models/User";

export const getIntegrationDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { integrationId } = req.params;

    if (!integrationId) {
      res.status(400).json({ error: "integrationId is required" });
      return;
    }

    const integration = await Integration.findById(integrationId).select(
      "-accessToken -refreshToken"
    );

    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    // getting total number of collection items
    const [
      organizationsCount,
      repositoriesCount,
      commitsCount,
      pullRequestsCount,
      issuesCount,
      issueChangelogsCount,
      usersCount,
    ] = await Promise.all([
      Organization.countDocuments({ integrationId }),
      Repository.countDocuments({ integrationId }),
      Commit.countDocuments({ integrationId }),
      PullRequest.countDocuments({ integrationId }),
      Issue.countDocuments({ integrationId }),
      IssueChangelog.countDocuments({ integrationId }),
      User.countDocuments({ integrationId }),
    ]);

    const totalDataPoints =
      organizationsCount +
      repositoriesCount +
      commitsCount +
      pullRequestsCount +
      issuesCount +
      issueChangelogsCount +
      usersCount;

    res.json({
      success: true,
      integration: {
        id: integration._id,
        userId: integration.userId,
        provider: integration.provider,
        status: integration.status,
        connectedAt: integration.connectedAt,
        lastSyncedAt: integration.lastSyncedAt,
        githubUser: integration.githubUser,
      },
      dataCounts: {
        organizations: organizationsCount,
        repositories: repositoriesCount,
        commits: commitsCount,
        pullRequests: pullRequestsCount,
        issues: issuesCount,
        issueChangelogs: issueChangelogsCount,
        users: usersCount,
        total: totalDataPoints,
      },
    });
  } catch (error: any) {
    console.error("Error getting integration details:", error);
    res.status(500).json({
      error: "Failed to get integration details",
      message: error.message,
    });
  }
};

// Remove integration and all related data
export const removeIntegration = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { integrationId } = req.params;

    if (!integrationId) {
      res.status(400).json({ error: "integrationId is required" });
      return;
    }

    // Find integration
    const integration = await Integration.findById(integrationId).session(
      session
    );

    if (!integration) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    // Store integration info before deletion for response
    const integrationInfo = {
      userId: integration.userId,
      provider: integration.provider,
      githubUser: integration.githubUser,
    };

    // Delete all related data in parallel
    const deleteResults = await Promise.all([
      IssueChangelog.deleteMany({ integrationId }).session(session),
      Issue.deleteMany({ integrationId }).session(session),
      PullRequest.deleteMany({ integrationId }).session(session),
      Commit.deleteMany({ integrationId }).session(session),
      Repository.deleteMany({ integrationId }).session(session),
      User.deleteMany({ integrationId }).session(session),
      Organization.deleteMany({ integrationId }).session(session),
    ]);

    // Delete integration
    await Integration.findByIdAndDelete(integrationId).session(session);

    // Calculate total deleted documents
    const totalDeleted = deleteResults.reduce(
      (sum, result) => sum + result.deletedCount,
      0
    );

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "Integration and all related data removed successfully",
      deletedIntegration: integrationInfo,
      deletedDocuments: totalDeleted,
      deletedCollections: {
        issueChangelogs: deleteResults[0].deletedCount,
        issues: deleteResults[1].deletedCount,
        pullRequests: deleteResults[2].deletedCount,
        commits: deleteResults[3].deletedCount,
        repositories: deleteResults[4].deletedCount,
        users: deleteResults[5].deletedCount,
        organizations: deleteResults[6].deletedCount,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error removing integration:", error);
    res
      .status(500)
      .json({ error: "Failed to remove integration", message: error.message });
  }
};

// clear all data and triggers fresh sync
export const resyncIntegration = async (
  req: Request,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { integrationId } = req.params;

    if (!integrationId) {
      res.status(400).json({ error: "integrationId is required" });
      await session.abortTransaction();
      session.endSession();
      return;
    }

    const integration = await Integration.findById(integrationId).session(
      session
    );

    if (!integration) {
      await session.abortTransaction();
      session.endSession();
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    if (integration.status !== "active") {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({
        error: "Integration is not active",
        status: integration.status,
      });
      return;
    }

    // Delete all synced data (keep integration)
    const deleteResults = await Promise.all([
      IssueChangelog.deleteMany({ integrationId }).session(session),
      Issue.deleteMany({ integrationId }).session(session),
      PullRequest.deleteMany({ integrationId }).session(session),
      Commit.deleteMany({ integrationId }).session(session),
      Repository.deleteMany({ integrationId }).session(session),
      User.deleteMany({ integrationId }).session(session),
      Organization.deleteMany({ integrationId }).session(session),
    ]);

    // Calculate total deleted documents
    const totalDeleted = deleteResults.reduce(
      (sum, result) => sum + result.deletedCount,
      0
    );

    // Update integration lastSyncedAt
    integration.lastSyncedAt = new Date();
    await integration.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: "All synced data cleared. Ready for fresh sync.",
      integrationId: integration._id,
      deletedDocuments: totalDeleted,
      clearedCollections: {
        issueChangelogs: deleteResults[0].deletedCount,
        issues: deleteResults[1].deletedCount,
        pullRequests: deleteResults[2].deletedCount,
        commits: deleteResults[3].deletedCount,
        repositories: deleteResults[4].deletedCount,
        users: deleteResults[5].deletedCount,
        organizations: deleteResults[6].deletedCount,
      },
      nextStep:
        "Call POST /api/github/sync/:integrationId to fetch fresh data from GitHub",
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error resyncing integration:", error);
    res
      .status(500)
      .json({ error: "Failed to resync integration", message: error.message });
  }
};
