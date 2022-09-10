import { Command } from "cliffy/command/mod.ts";
import { getOAuthClient } from "./_utils/oauth.ts";
import { getUser, getUserTimeline } from "./_utils/twitter.ts";
import { format } from "std/datetime/mod.ts";
import { basename, extname } from "std/path/mod.ts";
import { download } from "download/mod.ts";

import "dotenv/load.ts";

const CONSUMER_KEY = Deno.env.get("CONSUMER_KEY") || "";
const CONSUMER_SECRET = Deno.env.get("CONSUMER_SECRET") || "";
const OAUTH_TOKEN = Deno.env.get("OAUTH_TOKEN") || "";
const OAUTH_TOKEN_SECRET = Deno.env.get("OAUTH_TOKEN_SECRET") || "";

const client = getOAuthClient(CONSUMER_KEY, CONSUMER_SECRET);

new Command()
  .name("image-download")
  .version("0.0.1")
  .option("-u, --username <string>", "Twitter ScreenName.")
  .option("-d, --dest <string>", "Path to save the downloaded image.", {
    default: "./",
  })
  .option(
    "--start-time <string>",
    "YYYY-MM-DDTHH:mm:ssZ (ISO 8601/RFC 3339).",
  )
  .option("--end-time <string>", "YYYY-MM-DDTHH:mm:ssZ (ISO 8601/RFC 3339).")
  .action(async (options, ...args) => {
    if (!(await Deno.stat(options.dest)).isDirectory) {
      throw new Error(`${options.dest} is not directory.`);
    }

    const username = options.username || "";

    const user = await getUser(
      client,
      OAUTH_TOKEN,
      OAUTH_TOKEN_SECRET,
      username,
    );
    console.log(user);
    if (typeof user?.data?.id === "undefined") {
      throw new Error(`${username} is not exists.`);
    }

    let nextToken: string | undefined = undefined;
    do {
      const timeline: any = await getUserTimeline(
        client,
        OAUTH_TOKEN,
        OAUTH_TOKEN_SECRET,
        user.data.id,
        {
          start_time: options.startTime,
          end_time: options.endTime,
          pagination_token: nextToken,
        },
      );

      if (timeline.meta.result_count <= 0 || !timeline.data) {
        continue;
      }

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
              elem.media_key === media_key && elem.type === "photo",
          );

          if (typeof found !== "undefined") {
            console.log(found);
            const img = new URL(found.url);
            await download(found.url + "?format=png&name=4096x4096", {
              dir: options.dest,
              file: `${format(new Date(tweet.created_at), "yyyyMMddHHmmss")}_${
                basename(img.pathname, extname(img.pathname))
              }.png`,
            });
          }
        }
      }

      nextToken = timeline?.meta?.next_token;
    } while (typeof nextToken !== "undefined");
  })
  .parse(Deno.args);
