import { getOAuthClient } from "./_utils/oauth.ts";
import { accessToken, BASE_URL, requestToken } from "./_utils/twitter.ts";

import "dotenv/load.ts";

const CONSUMER_KEY = Deno.env.get("CONSUMER_KEY") || "";
const CONSUMER_SECRET = Deno.env.get("CONSUMER_SECRET") || "";

const client = getOAuthClient(CONSUMER_KEY, CONSUMER_SECRET);

(async () => {
  const authorizeUrl = new URL(`${BASE_URL}/oauth/authorize`);

  // Get request token
  const oAuthRequestToken = await requestToken(client);

  // Get authorization
  authorizeUrl.searchParams.append(
    "oauth_token",
    oAuthRequestToken.oauth_token,
  );

  console.log("Please go here and authorize:", authorizeUrl.href);
  const pin = prompt("Paste the PIN here:");

  // Get the access token
  const oAuthAccessToken = await accessToken(
    client,
    oAuthRequestToken.oauth_token,
    (pin || "").trim(),
  );
  console.log(oAuthAccessToken);
})()
  .then(() => Deno.exit(0))
  .catch((err) => {
    console.error(err);
    Deno.exit(1);
  });
