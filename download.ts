import { Command } from "cliffy/command/mod.ts";
import twitter from "./_utils/twitter.ts";
import { download } from "download/mod.ts";
import { format } from "std/datetime/mod.ts";
import { basename, extname } from "std/path/mod.ts";

new Command()
  .name("download")
  .version("0.1.1")
  .option("-u, --username <string>", "Twitter ScreenName.")
  .option("-d, --dest <string>", "Path to save the downloaded image.", {
    default: "./",
  })
  .option(
    "--start-time <string>",
    "YYYY-MM-DDTHH:mm:ssZ (ISO 8601/RFC 3339).",
  )
  .option(
    "--end-time <string>",
    "YYYY-MM-DDTHH:mm:ssZ (ISO 8601/RFC 3339).",
  )
  .action(async (options, ...args) => {
    if (!(await Deno.stat(options.dest)).isDirectory) {
      throw new Error(`${options.dest} is not directory.`);
    }

    const username = options.username || "";
    console.log(username);

    await twitter(
      username,
      {
        paging: 100,
        height: 10000,
        startTime: options.startTime ? new Date(options.startTime) : undefined,
        endTime: options.endTime ? new Date(options.endTime) : undefined,
      },
      async (tweet) => {
        console.log(tweet);

        if (tweet.username !== username) {
          return;
        }

        for (const image of tweet.images) {
          const pathname = new URL(image).pathname;
          await download(image, {
            dir: options.dest,
            file: `${format(new Date(tweet.datetime), "yyyyMMddHHmmss")}_${
              basename(pathname, extname(pathname))
            }.png`,
          });
        }
      },
    );
  })
  .parse(Deno.args);
