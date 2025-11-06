import axios from "axios";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL ||
  "http://localhost:4200/auth/github/callback";

export const getGithubAuthUrl = (): string => {
  const scope = "repo,user,read:org";
  // Use frontend callback URL
  const callbackUrl = GITHUB_CALLBACK_URL;
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${callbackUrl}&scope=${scope}`;
  return authUrl;
};

// Exchange authorization code for access token
export const exchangeCodeForToken = async (code: string): Promise<any> => {
  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error exchanging code for token:", error);
    throw error;
  }
};
