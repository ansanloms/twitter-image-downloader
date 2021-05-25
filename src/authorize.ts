import qs from "querystring";
import readline from "readline";
import fetch from "node-fetch";
import dotenv from "dotenv";

import { getOAuth } from "./lib/oauth";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const base_url = process.env.BASE_URL || "";
const consumer_key = process.env.CONSUMER_KEY || "";
const consumer_secret = process.env.CONSUMER_SECRET || "";

const oauth = getOAuth(consumer_key, consumer_secret);

async function input(prompt: string): Promise<string> {
  return new Promise(async (resolve) => {
    rl.question(prompt, (out: string) => {
      rl.close();
      resolve(out);
    });
  });
}

async function requestToken(): Promise<{
  oauth_token: string;
  oauth_token_secret: string;
}> {
  const requestTokenURL = `${base_url}/oauth/request_token?oauth_callback=oob`;

  const authHeader = oauth.toHeader(
    oauth.authorize({
      url: requestTokenURL,
      method: "POST",
    })
  );

  const req = await fetch(requestTokenURL, {
    method: "POST",
    headers: {
      Authorization: authHeader["Authorization"],
    },
    redirect: "follow",
  });

  const body = await req.text();

  if (body) {
    return qs.parse(body) as {
      oauth_token: string;
      oauth_token_secret: string;
    };
  } else {
    throw new Error("Cannot get an OAuth request token");
  }
}

async function accessToken(
  {
    oauth_token,
  }: {
    oauth_token: string;
    oauth_token_secret: string;
  },
  verifier: string
) {
  const authHeader = oauth.toHeader(
    oauth.authorize({
      url: `${base_url}/oauth/access_token`,
      method: "POST",
    })
  );

  const req = await fetch(
    `${base_url}/oauth/access_token?oauth_verifier=${verifier}&oauth_token=${oauth_token}`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader["Authorization"],
      },
      redirect: "follow",
    }
  );

  const body = await req.text();

  if (body) {
    return qs.parse(body);
  } else {
    throw new Error("Cannot get an OAuth request token");
  }
}

(async () => {
  try {
    const authorizeURL = new URL(`${base_url}/oauth/authorize`);

    // Get request token
    const oAuthRequestToken = await requestToken();

    // Get authorization
    authorizeURL.searchParams.append(
      "oauth_token",
      oAuthRequestToken.oauth_token
    );
    console.log("Please go here and authorize:", authorizeURL.href);
    const pin = await input("Paste the PIN here: ");

    // Get the access token
    const oAuthAccessToken = await accessToken(oAuthRequestToken, pin.trim());
    console.log(oAuthAccessToken);
  } catch (e) {
    console.log(e);
    process.exit(-1);
  }
  process.exit();
})();
