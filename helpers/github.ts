import axios, { AxiosInstance } from "axios";

// GitHub API client
export const createGithubClient = (accessToken: string): AxiosInstance => {
  return axios.create({
    baseURL: "https://api.github.com",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
};

// getting all pages from GitHub API
export const fetchAllPages = async (
  client: AxiosInstance,
  url: string,
  params: any = {}
): Promise<any[]> => {
  const allItems: any[] = [];
  let nextUrl: string | null = url;
  let page = 1;

  while (nextUrl) {
    try {
      const response: any = await client.get(
        nextUrl.replace("https://api.github.com", ""),
        {
          params: { ...params, per_page: 100, page },
        }
      );

      const items = response.data;
      if (Array.isArray(items)) {
        allItems.push(...items);
      }

      // Check for Link header for pagination
      const linkHeader: string = response.headers["link"];
      if (linkHeader) {
        const nextMatch: RegExpMatchArray | null = linkHeader.match(
          /<([^>]+)>;\s*rel="next"/
        );
        if (nextMatch) {
          nextUrl = nextMatch[1];
          page++;
        } else {
          nextUrl = null;
        }
      } else {
        // No more pages available
        nextUrl = null;
      }

      // avoiding event loop blocking and rate limiting
      if (nextUrl) {
        await new Promise((resolve) => setImmediate(resolve));
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error("Rate limit exceeded. Waiting...");
        await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 1 minute
        continue;
      }
      throw error;
    }
  }

  return allItems;
};

export const getAuthenticatedUser = async (
  accessToken: string
): Promise<any> => {
  try {
    const client = createGithubClient(accessToken);
    const response = await client.get("/user");
    return response.data;
  } catch (error) {
    console.error("Error fetching authenticated user:", error);
    throw error;
  }
};

export const getUserOrganizations = async (
  accessToken: string
): Promise<any[]> => {
  try {
    const client = createGithubClient(accessToken);
    const organizations = await fetchAllPages(
      client,
      "https://api.github.com/user/orgs"
    );
    return organizations;
  } catch (error) {
    console.error("Error fetching user organizations:", error);
    throw error;
  }
};

export const getOrganizationRepos = async (
  accessToken: string,
  org: string
): Promise<any[]> => {
  try {
    const client = createGithubClient(accessToken);
    const repos = await fetchAllPages(
      client,
      `https://api.github.com/orgs/${org}/repos`
    );
    return repos;
  } catch (error) {
    console.error(`Error fetching repos for organization ${org}:`, error);
    throw error;
  }
};

export const getRepoCommits = async (
  accessToken: string,
  owner: string,
  repo: string
): Promise<any[]> => {
  try {
    const client = createGithubClient(accessToken);
    const commits: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await client.get(`/repos/${owner}/${repo}/commits`, {
        params: { per_page: 100, page },
      });

      const pageCommits = response.data;
      if (Array.isArray(pageCommits) && pageCommits.length > 0) {
        commits.push(...pageCommits);
        page++;

        //event loop blocking
        await new Promise((resolve) => setImmediate(resolve));
      } else {
        hasMore = false;
      }

      // Stop if we have fetched a reasonable amount of data - threshold 2k possible
      if (pageCommits.length < 100) {
        hasMore = false;
      }
    }

    return commits;
  } catch (error) {
    console.error(`Error fetching commits for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getRepoPullRequests = async (
  accessToken: string,
  owner: string,
  repo: string
): Promise<any[]> => {
  try {
    const client = createGithubClient(accessToken);
    const pulls = await fetchAllPages(
      client,
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      { state: "all" }
    );
    return pulls;
  } catch (error) {
    console.error(`Error fetching pull requests for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getRepoIssues = async (
  accessToken: string,
  owner: string,
  repo: string
): Promise<any[]> => {
  try {
    const client = createGithubClient(accessToken);
    const issues = await fetchAllPages(
      client,
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      { state: "all" }
    );
    return issues;
  } catch (error) {
    console.error(`Error fetching issues for ${owner}/${repo}:`, error);
    throw error;
  }
};

export const getIssueEvents = async (
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<any[]> => {
  try {
    const client = createGithubClient(accessToken);
    const events = await fetchAllPages(
      client,
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/events`
    );
    return events;
  } catch (error) {
    console.error(`Error fetching events for issue #${issueNumber}:`, error);
    throw error;
  }
};

export const getOrganizationMembers = async (
  accessToken: string,
  org: string
): Promise<any[]> => {
  try {
    const client = createGithubClient(accessToken);
    const members = await fetchAllPages(
      client,
      `https://api.github.com/orgs/${org}/members`
    );
    return members;
  } catch (error) {
    console.error(`Error fetching members for organization ${org}:`, error);
    throw error;
  }
};
