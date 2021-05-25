import OAuth from "oauth-1.0a";
import crypto from "crypto";

export const signature_method = "HMAC-SHA1";

export const getOAuth = (consumer_key: string, consumer_secret: string) => {
  return new OAuth({
    consumer: {
      key: consumer_key,
      secret: consumer_secret,
    },
    signature_method: signature_method,
    hash_function: (baseString, key) =>
      crypto.createHmac("sha1", key).update(baseString).digest("base64"),
  });
};

export const getAuthHeader = (
  oauth: OAuth,
  url: string,
  method: string,
  key: string,
  secret: string
) => {
  return oauth.toHeader(
    oauth.authorize(
      {
        url: url,
        method: method,
      },
      {
        key: key,
        secret: secret,
      }
    )
  );
};
