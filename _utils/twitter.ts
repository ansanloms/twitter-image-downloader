import { OAuthClient, toAuthHeader } from "oauth-1.0a/main/mod.ts";
import { getAuthHeader } from "./oauth.ts";
import * as querystring from "std/node/querystring.ts";

export const BASE_URL = "https://api.twitter.com";

export const requestToken = async (client: OAuthClient): Promise<{
  oauth_token: string;
  oauth_token_secret: string;
}> => {
  const requestTokenUrl = `${BASE_URL}/oauth/request_token?oauth_callback=oob`;

  const authHeader = toAuthHeader(
    client.sign("POST", requestTokenUrl),
  );

  const req = await fetch(requestTokenUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
    },
    redirect: "follow",
  });

  const body = await req.text();

  if (body) {
    return querystring.parse(body) as {
      oauth_token: string;
      oauth_token_secret: string;
    };
  } else {
    throw new Error("Cannot get an OAuth request token");
  }
};

export const accessToken = async (
  client: OAuthClient,
  token: string,
  verifier: string,
) => {
  const accessTokenUrl = `${BASE_URL}/oauth/access_token`;

  const authHeader = toAuthHeader(
    client.sign("POST", accessTokenUrl),
  );

  const req = await fetch(
    `${accessTokenUrl}?oauth_verifier=${verifier}&oauth_token=${token}`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      redirect: "follow",
    },
  );

  const body = await req.text();

  if (body) {
    return querystring.parse(body);
  } else {
    throw new Error("Cannot get an OAuth request token");
  }
};

export const getUser = async (
  client: OAuthClient,
  key: string,
  secret: string,
  username: string,
) => {
  const endpoint = `${BASE_URL}/2/users/by/username/${username}`;
  const method = "GET";
  const authHeader = getAuthHeader(
    client,
    endpoint,
    method,
    key,
    secret,
  );

  const res = await fetch(endpoint, {
    method: method,
    headers: {
      Authorization: authHeader,
    },
    redirect: "follow",
  });

  const json = await res.json();

  return json;
};

export const getUserTimeline = async (
  client: OAuthClient,
  key: string,
  secret: string,
  id: string,
  params: {
    since_id?: string;
    until_id?: string;
    start_time?: string;
    end_time?: string;
    pagination_token?: string;
  },
) => {
  const endpoint = `${BASE_URL}/2/users/${id}/tweets?${
    querystring.encode({
      ...Object.fromEntries(
        Object.entries(params).filter(([k, v]) => v !== undefined),
      ),
      max_results: "100",
      expansions: "attachments.media_keys,referenced_tweets.id",
      "tweet.fields": "created_at",
      "media.fields": "media_key,type,url",
    })
  }`;
  const method = "GET";

  const authHeader = getAuthHeader(
    client,
    endpoint,
    method,
    key,
    secret,
  );

  const res = await fetch(endpoint, {
    method: method,
    headers: {
      Authorization: authHeader,
    },
    redirect: "follow",
  });

  const json = await res.json();

  return json;
};
