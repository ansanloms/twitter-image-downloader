import { HMAC_SHA1, OAuthClient, toAuthHeader } from "oauth-1.0a/main/mod.ts";

export const getOAuthClient = (consumer_key: string, consumer_secret: string) =>
  new OAuthClient({
    consumer: {
      key: consumer_key,
      secret: consumer_secret,
    },
    signature: HMAC_SHA1,
  });

export const getAuthHeader = (
  oauth: OAuthClient,
  url: string,
  method: string,
  key: string,
  secret: string,
) =>
  toAuthHeader(
    oauth.sign(
      method,
      url,
      {
        token: {
          key: key,
          secret: secret,
        },
      },
    ),
  );
