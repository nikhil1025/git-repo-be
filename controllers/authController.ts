import { Request, Response } from "express";
import { getAuthenticatedUser } from "../helpers/github";
import { exchangeCodeForToken, getGithubAuthUrl } from "../helpers/oauth";
import Integration from "../models/Integration";

// OAuth authorization URL Fetch here
export const getAuthUrl = (req: Request, res: Response): void => {
  try {
    const authUrl = getGithubAuthUrl();
    res.json({ authUrl });
  } catch (error: any) {
    console.error("Error getting auth URL:", error);
    res
      .status(500)
      .json({ error: "Failed to generate auth URL", message: error.message });
  }
};

// OAuth callback Handled Here
export const handleCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const code = (req.query.code || req.body.code) as string;

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Authorization code is required" });
      return;
    }

    const tokenData = await exchangeCodeForToken(code);
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      res.status(400).json({ error: "Failed to obtain access token" });
      return;
    }

    const githubUser = await getAuthenticatedUser(accessToken);

    // checking if integration already exists
    let integration = await Integration.findOne({
      userId: githubUser.id.toString(),
      provider: "github",
    });

    if (integration) {
      // updating existing integration
      integration.accessToken = accessToken;
      integration.status = "active";
      integration.tokenType = tokenData.token_type;
      integration.scope = tokenData.scope;
      integration.connectedAt = new Date();
      integration.githubUser = {
        id: githubUser.id,
        login: githubUser.login,
        name: githubUser.name,
        email: githubUser.email,
        avatar_url: githubUser.avatar_url,
        html_url: githubUser.html_url,
      };
      await integration.save();
    } else {
      // creating new integration
      integration = new Integration({
        userId: githubUser.id.toString(),
        provider: "github",
        accessToken: accessToken,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        connectedAt: new Date(),
        status: "active",
        githubUser: {
          id: githubUser.id,
          login: githubUser.login,
          name: githubUser.name,
          email: githubUser.email,
          avatar_url: githubUser.avatar_url,
          html_url: githubUser.html_url,
        },
      });
      await integration.save();
    }

    // redirect or respond based on request method for integration based upon its status
    // check if this is a POST request (from frontend) or GET (from GitHub redirect)
    if (req.method === "POST") {
      // Return Data for frontend POST requests
      res.json({
        success: true,
        message: "Integration connected successfully",
        integration: {
          id: integration._id,
          userId: integration.userId,
          provider: integration.provider,
          connectedAt: integration.connectedAt,
          status: integration.status,
          githubUser: integration.githubUser,
        },
      });
    } else {
      // Redirect to frontend for GitHub GET redirect
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
      const redirectUrl = `${frontendUrl}/auth/success?userId=${integration.userId}&integrationId=${integration._id}`;
      res.redirect(redirectUrl);
    }
  } catch (error: any) {
    console.error("Error handling callback:", error);

    if (req.method === "POST") {
      res.status(500).json({
        error: "Failed to handle callback",
        message: error.message,
      });
    } else {
      // redirecting to frontend with error for GitHub
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
      const redirectUrl = `${frontendUrl}/auth/error?message=${encodeURIComponent(
        error.message
      )}`;
      res.redirect(redirectUrl);
    }
  }
};

export const getIntegrationStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId || typeof userId !== "string") {
      res.status(400).json({ error: "userId is required" });
      return;
    }

    const integration = await Integration.findOne({
      userId: userId,
      status: "active",
    }).select("-accessToken -refreshToken");

    if (!integration) {
      res.json({
        connected: false,
        integration: null,
      });
      return;
    }

    res.json({
      connected: true,
      integration: {
        id: integration._id,
        userId: integration.userId,
        provider: integration.provider,
        connectedAt: integration.connectedAt,
        lastSyncedAt: integration.lastSyncedAt,
        status: integration.status,
        githubUser: integration.githubUser,
      },
    });
  } catch (error: any) {
    console.error("Error getting integration status:", error);
    res.status(500).json({
      error: "Failed to get integration status",
      message: error.message,
    });
  }
};
