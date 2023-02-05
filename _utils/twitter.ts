import puppeteer from "puppeteer/mod.ts";
import type { ElementHandle, Page } from "puppeteer/mod.ts";

type Tweet = {
  id: bigint;
  username: string;
  body?: string;
  datetime: Date;
  images: string[];
};

const scroll = async (page: Page) => {
  await page.evaluate(() => {
    window.scrollBy(0, window.innerHeight);
  });
  await page.waitForTimeout(5000);
  await viewSensitiveContent(page);
};

const viewSensitiveProfile = async (page: Page) => {
  (await page.$x("//*[text()='Yes, view profile']")).forEach((v) => v.click());
};

const viewSensitiveContent = async (page: Page) => {
  await page.$$eval("[role='presentation'] span", (l) => {
    l.forEach((i) => {
      if (i.innerText === "View") {
        i.click();
      }
    });
  });
};

const timeline = async (page: Page) => {
  const timeline = await page.$$(
    "[aria-label^='Timeline: '][aria-label$='’s Tweets'] > div > div",
  );

  return timeline;
};

const tweet = async (
  element: ElementHandle,
): Promise<Tweet | undefined> => {
  const { id, username } = await (async () => {
    const elems = await element.$$(
      `a[href*='/status/'`,
    );
    for (const v of elems) {
      const url = await (await v.getProperty("href")).jsonValue();
      const pattern = new URLPattern({
        pathname: "/:username/status/:id",
      }).exec(url)?.pathname.groups;

      return {
        id: pattern?.id ? BigInt(pattern.id) : undefined,
        username: pattern?.username,
      };
    }

    return {
      id: undefined,
      username: undefined,
    };
  })();
  if (!id) {
    return undefined;
  }
  if (!username) {
    return undefined;
  }

  const datetime = await (async () => {
    const datetime = await element.$eval(
      "time",
      (i) => i.getAttribute("datetime"),
    );

    if (!datetime) {
      return undefined;
    }

    return new Date(datetime);
  })();
  if (!datetime) {
    return undefined;
  }

  const body = await (async () => {
    const elem = await element.$(
      "[data-testid='tweetText']",
    );

    const body = await (await elem?.getProperty("innerText"))?.jsonValue() ||
      "";

    return body.length > 0 ? body as string : undefined;
  })();

  const photos = await element.$$("a[href*='/photo/']");
  const images = (await Promise.all(
    photos.map(async (photo) =>
      await photo?.$eval(
        "img",
        (i) => i.getAttribute("src"),
      ) as string
    ),
  )).map((image) => {
    const imageUrl = new URL(image);
    const defaultParams = [...imageUrl.searchParams.keys()];
    defaultParams.forEach((param) => imageUrl.searchParams.delete(param));
    imageUrl.searchParams.set("format", "png");
    imageUrl.searchParams.set("name", "4096x4096");

    return imageUrl.toString();
  });

  return {
    id,
    username,
    body,
    datetime,
    images,
  };
};

const tweets = async (page: Page): Promise<Tweet[]> => {
  return (await Promise.all(
    (await timeline(page)).map(async (elem) => await tweet(elem)),
  )).filter<Tweet>((v): v is Tweet => typeof v !== "undefined");
};

export default async function (
  username: string,
  options: {
    paging: number;
    height: number;
    startTime?: Date;
    endTime?: Date;
  } = { paging: 100, height: 10000 },
  callback?: (tweet: Tweet) => Promise<void>,
) {
  const browser = await puppeteer.launch();

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: options.height });
  await page.goto(`https://twitter.com/${username}?lang=en-US`, {
    waitUntil: "networkidle0",
  });

  await viewSensitiveProfile(page);

  let minId = BigInt(
    9999999999999999999999999999999999999999999999999999999999999,
  );

  for (let i = 0; i <= options.paging; i++) {
    await scroll(page);

    const list = (await tweets(page))
      .filter((v) => {
        if (options.startTime) {
          return v.datetime >= options.startTime;
        } else {
          return true;
        }
      })
      .filter((v) => {
        if (options.endTime) {
          return v.datetime <= options.endTime;
        } else {
          return true;
        }
      })
      .filter((v) => v.id < minId);

    minId = list.length > 0
      ? list.reduce((a, b) => a.id < b.id ? a : b)?.id || minId
      : minId;

    if (callback) {
      for (const tw of list) {
        await callback(tw);
      }
    }
  }

  await browser.close();
}
