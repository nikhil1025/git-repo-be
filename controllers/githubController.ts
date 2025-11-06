import { Request, Response } from "express";
import {
  getIssueEvents,
  getOrganizationMembers,
  getOrganizationRepos,
  getRepoCommits,
  getRepoIssues,
  getRepoPullRequests,
  getUserOrganizations,
} from "../helpers/github";
import Commit from "../models/Commit";
import Integration from "../models/Integration";
import Issue from "../models/Issue";
import IssueChangelog from "../models/IssueChangelog";
import Organization from "../models/Organization";
import PullRequest from "../models/PullRequest";
import Repository from "../models/Repository";
import User from "../models/User";

export const syncGithubData = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { integrationId } = req.params;

    if (!integrationId) {
      res.status(400).json({ error: "integrationId is required" });
      return;
    }

    // integrating and getting access token
    const integration = await Integration.findById(integrationId);

    if (!integration) {
      res.status(404).json({ error: "Integration not found" });
      return;
    }

    // recieved access token
    const accessToken = integration.accessToken;
    let syncStats = {
      organizations: 0,
      repositories: 0,
      commits: 0,
      pullRequests: 0,
      issues: 0,
      issueChangelogs: 0,
      users: 0,
    };

    // Fetch and store organizations
    console.log("Fetching organizations...");
    const organizations = await getUserOrganizations(accessToken);

    for (const org of organizations) {
      await Organization.findOneAndUpdate(
        { githubId: org.id },
        {
          integrationId: integration._id,
          githubId: org.id,
          login: org.login,
          name: org.name,
          description: org.description,
          html_url: org.html_url,
          avatar_url: org.avatar_url,
          type: org.type,
          created_at: org.created_at,
          updated_at: org.updated_at,
          public_repos: org.public_repos,
          followers: org.followers,
          following: org.following,
        },
        { upsert: true, new: true }
      );
      syncStats.organizations++;

      // event loop blocking here
      await new Promise((resolve) => setImmediate(resolve));
    }

    console.log(`Synced ${syncStats.organizations} organizations`);
    for (const org of organizations) {
      const orgDoc = await Organization.findOne({ githubId: org.id });
      if (!orgDoc) continue;

      console.log(`Fetching repositories for organization: ${org.login}`);
      const repos = await getOrganizationRepos(accessToken, org.login);

      // Store repos
      for (const repo of repos) {
        const repoDoc = await Repository.findOneAndUpdate(
          { githubId: repo.id },
          {
            integrationId: integration._id,
            organizationId: orgDoc._id,
            githubId: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            private: repo.private,
            fork: repo.fork,
            created_at: repo.created_at,
            updated_at: repo.updated_at,
            pushed_at: repo.pushed_at,
            size: repo.size,
            stargazers_count: repo.stargazers_count,
            watchers_count: repo.watchers_count,
            language: repo.language,
            forks_count: repo.forks_count,
            open_issues_count: repo.open_issues_count,
            default_branch: repo.default_branch,
            owner: {
              login: repo.owner.login,
              id: repo.owner.id,
              type: repo.owner.type,
            },
          },
          { upsert: true, new: true }
        );
        syncStats.repositories++;

        await new Promise((resolve) => setImmediate(resolve));

        // commits fetching
        console.log(`Fetching commits for repository: ${repo.full_name}`);
        try {
          const commits = await getRepoCommits(
            accessToken,
            repo.owner.login,
            repo.name
          );

          // inserting commits to db
          const commitOps = commits.map((commit) => ({
            updateOne: {
              filter: { sha: commit.sha },
              update: {
                integrationId: integration._id,
                repositoryId: repoDoc._id,
                sha: commit.sha,
                message: commit.commit?.message,
                author: {
                  name: commit.commit?.author?.name,
                  email: commit.commit?.author?.email,
                  date: commit.commit?.author?.date,
                },
                committer: {
                  name: commit.commit?.committer?.name,
                  email: commit.commit?.committer?.email,
                  date: commit.commit?.committer?.date,
                },
                html_url: commit.html_url,
                parents: commit.parents?.map((p: any) => ({ sha: p.sha })),
                stats: {
                  additions: commit.stats?.additions,
                  deletions: commit.stats?.deletions,
                  total: commit.stats?.total,
                },
              },
              upsert: true,
            },
          }));

          if (commitOps.length > 0) {
            await Commit.bulkWrite(commitOps);
            syncStats.commits += commits.length;
          }

          await new Promise((resolve) => setImmediate(resolve));
        } catch (error) {
          console.error(`Error fetching commits for ${repo.full_name}:`, error);
        }

        // Fetch pull requests
        console.log(`Fetching pull requests for repository: ${repo.full_name}`);
        try {
          const pullRequests = await getRepoPullRequests(
            accessToken,
            repo.owner.login,
            repo.name
          );

          // updating pull-requests
          const prOps = pullRequests.map((pr) => ({
            updateOne: {
              filter: { repositoryId: repoDoc._id, number: pr.number },
              update: {
                integrationId: integration._id,
                repositoryId: repoDoc._id,
                githubId: pr.id,
                number: pr.number,
                title: pr.title,
                state: pr.state,
                body: pr.body,
                html_url: pr.html_url,
                created_at: pr.created_at,
                updated_at: pr.updated_at,
                closed_at: pr.closed_at,
                merged_at: pr.merged_at,
                user: {
                  login: pr.user?.login,
                  id: pr.user?.id,
                  avatar_url: pr.user?.avatar_url,
                },
                head: {
                  ref: pr.head?.ref,
                  sha: pr.head?.sha,
                },
                base: {
                  ref: pr.base?.ref,
                  sha: pr.base?.sha,
                },
                merged: pr.merged,
                mergeable: pr.mergeable,
                comments: pr.comments,
                commits: pr.commits,
                additions: pr.additions,
                deletions: pr.deletions,
                changed_files: pr.changed_files,
              },
              upsert: true,
            },
          }));

          if (prOps.length > 0) {
            await PullRequest.bulkWrite(prOps);
            syncStats.pullRequests += pullRequests.length;
          }

          await new Promise((resolve) => setImmediate(resolve));
        } catch (error) {
          console.error(
            `Error fetching pull requests for ${repo.full_name}:`,
            error
          );
        }

        // issues
        console.log(`Fetching issues for repository: ${repo.full_name}`);
        try {
          const issues = await getRepoIssues(
            accessToken,
            repo.owner.login,
            repo.name
          );

          const issueOps = issues.map((issue) => ({
            updateOne: {
              filter: { repositoryId: repoDoc._id, number: issue.number },
              update: {
                integrationId: integration._id,
                repositoryId: repoDoc._id,
                githubId: issue.id,
                number: issue.number,
                title: issue.title,
                state: issue.state,
                body: issue.body,
                html_url: issue.html_url,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
                closed_at: issue.closed_at,
                user: {
                  login: issue.user?.login,
                  id: issue.user?.id,
                  avatar_url: issue.user?.avatar_url,
                },
                labels: issue.labels?.map((label: any) => ({
                  id: label.id,
                  name: label.name,
                  color: label.color,
                })),
                assignees: issue.assignees?.map((assignee: any) => ({
                  login: assignee.login,
                  id: assignee.id,
                })),
                comments: issue.comments,
                locked: issue.locked,
              },
              upsert: true,
            },
          }));

          if (issueOps.length > 0) {
            await Issue.bulkWrite(issueOps);
            syncStats.issues += issues.length;
          }

          await new Promise((resolve) => setImmediate(resolve));

          // changelogs
          for (const issue of issues) {
            try {
              const issueDoc = await Issue.findOne({
                repositoryId: repoDoc._id,
                number: issue.number,
              });

              if (issueDoc) {
                const events = await getIssueEvents(
                  accessToken,
                  repo.owner.login,
                  repo.name,
                  issue.number
                );

                // update changelogs
                const eventOps = events.map((event) => ({
                  updateOne: {
                    filter: {
                      issueId: issueDoc._id,
                      githubEventId: event.id,
                    },
                    update: {
                      integrationId: integration._id,
                      repositoryId: repoDoc._id,
                      issueId: issueDoc._id,
                      githubEventId: event.id,
                      event: event.event,
                      created_at: event.created_at,
                      actor: {
                        login: event.actor?.login,
                        id: event.actor?.id,
                      },
                      label: event.label
                        ? {
                            name: event.label.name,
                            color: event.label.color,
                          }
                        : undefined,
                      assignee: event.assignee
                        ? {
                            login: event.assignee.login,
                            id: event.assignee.id,
                          }
                        : undefined,
                      rename: event.rename,
                      commit_id: event.commit_id,
                      commit_url: event.commit_url,
                    },
                    upsert: true,
                  },
                }));

                if (eventOps.length > 0) {
                  await IssueChangelog.bulkWrite(eventOps);
                  syncStats.issueChangelogs += events.length;
                }

                await new Promise((resolve) => setImmediate(resolve));
              }
            } catch (error) {
              console.error(
                `Error fetching events for issue #${issue.number}:`,
                error
              );
            }
          }
        } catch (error) {
          console.error(`Error fetching issues for ${repo.full_name}:`, error);
        }
      }

      // users
      // console.log(`Fetching members for organization: ${org.login}`);
      try {
        const members = await getOrganizationMembers(accessToken, org.login);

        // update users
        const userOps = members.map((member) => ({
          updateOne: {
            filter: { githubId: member.id },
            update: {
              integrationId: integration._id,
              organizationId: orgDoc._id,
              githubId: member.id,
              login: member.login,
              name: member.name,
              email: member.email,
              avatar_url: member.avatar_url,
              html_url: member.html_url,
              type: member.type,
              site_admin: member.site_admin,
              company: member.company,
              blog: member.blog,
              location: member.location,
              bio: member.bio,
              public_repos: member.public_repos,
              public_gists: member.public_gists,
              followers: member.followers,
              following: member.following,
              created_at: member.created_at,
              updated_at: member.updated_at,
            },
            upsert: true,
          },
        }));

        if (userOps.length > 0) {
          await User.bulkWrite(userOps);
          syncStats.users += members.length;
        }

        await new Promise((resolve) => setImmediate(resolve));
      } catch (error) {
        console.error(`Error fetching members for ${org.login}:`, error);
      }
    }

    integration.lastSyncedAt = new Date();
    await integration.save();

    console.log("Sync completed successfully");
    res.json({
      success: true,
      message: "GitHub data synced successfully",
      stats: syncStats,
    });
  } catch (error: any) {
    console.error("Error syncing GitHub data:", error);
    res
      .status(500)
      .json({ error: "Failed to sync GitHub data", message: error.message });
  }
};
