import { parentPort } from "worker_threads";
import {
  getIssueEvents,
  getRepoCommits,
  getRepoIssues,
  getRepoPullRequests,
} from "../helpers/github";

interface RepoJobPayload {
  accessToken: string;
  owner: string;
  repo: string;
}

interface RepoJobResult {
  commits: any[];
  pullRequests: any[];
  issues: any[];
  issueEvents: Record<number, any[]>;
}

const fetchRepoData = async (
  payload: RepoJobPayload
): Promise<RepoJobResult> => {
  const { accessToken, owner, repo } = payload;

  const [commits, pullRequests, issues] = await Promise.all([
    getRepoCommits(accessToken, owner, repo),
    getRepoPullRequests(accessToken, owner, repo),
    getRepoIssues(accessToken, owner, repo),
  ]);

  const issueEvents: Record<number, any[]> = {};
  for (const issue of issues) {
    try {
      const events = await getIssueEvents(
        accessToken,
        owner,
        repo,
        issue.number
      );
      issueEvents[issue.number] = events;
    } catch (error) {
      console.error(
        `Worker: error fetching events for ${owner}/${repo} issue #${issue.number}:`,
        error
      );
      issueEvents[issue.number] = [];
    }
  }

  return {
    commits,
    pullRequests,
    issues,
    issueEvents,
  };
};

parentPort?.on("message", async ({ jobId, payload }) => {
  try {
    const result = await fetchRepoData(payload as RepoJobPayload);
    parentPort?.postMessage({ jobId, result });
  } catch (error: any) {
    parentPort?.postMessage({
      jobId,
      error: {
        message: error?.message || "Unknown worker error",
        stack: error?.stack,
      },
    });
  }
});
