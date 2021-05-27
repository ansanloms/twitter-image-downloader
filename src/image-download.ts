import https from "https";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import qs from "querystring";
import dotenv from "dotenv";
import dayjs from "dayjs";
import { Command } from "commander";
import { getOAuth, getAuthHeader } from "./lib/oauth";

dotenv.config({ path: path.join(__dirname, "../.env") });

const program = new Command();

program
  .option("-u, --username <username>", "Twitter ScreenName.")
  .option("-d, --dest <dest>", "Path to save the downloaded image.", "./")
  .option(
    "--since-id <since_id>",
    "Returns results with an ID greater than (that is, more recent than) the specified ID."
  )
  .option(
    "--until-id <until_id>",
    "Returns results with an ID less less than (that is, older than) the specified ID."
  )
  .option(
    "--start-time <start_time>",
    "YYYY-MM-DDTHH:mm:ssZ (ISO 8601/RFC 3339)."
  )
  .option("--end-time <end_time>", "YYYY-MM-DDTHH:mm:ssZ (ISO 8601/RFC 3339).");

program.parse(process.argv);

const username = program.opts()?.username;
const dest = program.opts().dest;
const since_id = program.opts()?.sinceId;
const until_id = program.opts()?.untilId;
const start_time = program.opts()?.startTime;
const end_time = program.opts()?.endDime;

const base_url = process.env.BASE_URL || "";
const consumer_key = process.env.CONSUMER_KEY || "";
const consumer_secret = process.env.CONSUMER_SECRET || "";
const oauth_token = process.env.OAUTH_TOKEN || "";
const oauth_token_secret = process.env.OAUTH_TOKEN_SECRET || "";

const oauth = getOAuth(consumer_key, consumer_secret);

const getUser = async (username: string) => {
  const endpointURL = `${base_url}/2/users/by/username/${username}`;
  const endpointMethod = "GET";
  const authHeader = getAuthHeader(
    oauth,
    endpointURL,
    endpointMethod,
    oauth_token,
    oauth_token_secret
  );

  const res = await fetch(endpointURL, {
    method: endpointMethod,
    headers: {
      Authorization: authHeader["Authorization"],
    },
    redirect: "follow",
  });

  const json = await res.json();

  return json;
};

const getUserTimeline = async (id: string, next_token: string | undefined) => {
  const params: { [key in string]: string } = {
    max_results: "100",
    expansions: "attachments.media_keys,referenced_tweets.id",
    "tweet.fields": "created_at",
    "media.fields": "media_key,type,url",
  };

  if (since_id) {
    params.since_id = since_id;
  }
  if (until_id) {
    params.until_id = until_id;
  }
  if (start_time) {
    params.start_time = start_time;
  }
  if (end_time) {
    params.end_time = end_time;
  }

  if (next_token) {
    params.pagination_token = next_token;
  }

  const endpointURL = `${base_url}/2/users/${id}/tweets?${qs.encode(params)}`;
  const endpointMethod = "GET";
  const authHeader = getAuthHeader(
    oauth,
    endpointURL,
    endpointMethod,
    oauth_token,
    oauth_token_secret
  );

  const res = await fetch(endpointURL, {
    method: endpointMethod,
    headers: {
      Authorization: authHeader["Authorization"],
    },
    redirect: "follow",
  });

  const json = await res.json();

  return json;
};

const download = async (url: string, path: string) => {
  const res: any = await new Promise((resolve) => {
    https.get(url, resolve);
  });
  const data: Uint8Array[] = await new Promise((resolve, reject) => {
    let data: Uint8Array[] = [];
    res.on("data", (chunk: Uint8Array) => data.push(chunk));
    res.on("error", (err: Error) => reject(err));
    res.on("end", () => resolve(data));
  });
  await fs.promises.writeFile(path, Buffer.concat(data));
};

(async () => {
  if (!(await (await fs.promises.stat(dest)).isDirectory())) {
    throw new Error(`${dest} is not directory.`);
  }

  const user = await getUser(username);

  console.log(user);

  if (typeof user?.data?.id === "undefined") {
    throw new Error(`${username} is not exists.`);
  }

  let next_token = undefined;
  do {
    let timeline: any = await getUserTimeline(user.data.id, next_token);
    for (const tweet of timeline.data) {
      console.log(tweet.id);

      if ((tweet?.referenced_tweets || [])[0]?.type === "retweeted") {
        continue;
      }

      const media_keys = tweet?.attachments?.media_keys;
      if (typeof media_keys === "undefined") {
        continue;
      }

      for (const media_key of media_keys) {
        const found = timeline.includes.media.find(
          (elem: { media_key: string; type: string; url?: string }) =>
            elem.media_key === media_key && elem.type === "photo"
        );

        if (typeof found !== "undefined") {
          console.log(found);
          const img = new URL(found.url);
          download(
            found.url + "?format=png&name=4096x4096",
            path.join(
              dest,
              `${dayjs(tweet.created_at).format(
                "YYYYMMDDHHmmss"
              )}_${path.basename(img.pathname, path.extname(img.pathname))}.png`
            )
          );
        }
      }
    }

    next_token = timeline?.meta?.next_token;
  } while (typeof next_token !== "undefined");
})();
