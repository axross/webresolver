import { NextApiHandler } from "next";
import objectHash from "object-hash";
import * as path from "path";
import { launchChromium } from "playwright-aws-lambda";
import { ChromiumBrowser, Page } from "playwright-core";

const handler: NextApiHandler = async (req, res) => {
  if (req.method !== "GET") {
    res.status(404).end();

    return;
  }

  let browser!: ChromiumBrowser;
  try {
    browser = await launchChromium();
  } catch (error) {
    throw error;
  }

  let requestedUrl!: URL;
  try {
    requestedUrl = new URL(`${req.query.url}`);
  } catch (error) {
    res.status(400).end(`The url is not given or invalid.`);

    return;
  }

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(requestedUrl.toString());

  const json = {
    title: await getTitle(page),
    description: await getDescription(page),
    url: (await getUrl(page)) ?? requestedUrl,
    imageUrl: await getImageUrl(page),
  };

  if (browser) {
    await browser.close();
  }

  res
    .status(200)
    .setHeader("cache-control", "public, max-age=60, s-maxage=86400")
    .setHeader("etag", objectHash(json))
    .setHeader("access-control-allow-origin", "*")
    .json(json);
};

async function getTitle(page: Page): Promise<string | null> {
  let title = await page.$eval('meta[property="og:title"]', (el) =>
    el.getAttribute("content")
  );

  title ??= await page.$eval("title", (el) => el.textContent);

  return title;
}

async function getDescription(page: Page): Promise<string | null> {
  let description = await page.$eval('meta[property="og:description"]', (el) =>
    el.getAttribute("content")
  );

  description ??= await page.$eval('meta[name="description"]', (el) =>
    el.getAttribute("content")
  );

  return description;
}

async function getUrl(page: Page): Promise<string | null> {
  let url = await page.$eval('meta[property="og:url"]', (el) =>
    el.getAttribute("content")
  );

  return url;
}

async function getImageUrl(page: Page): Promise<string | null> {
  let imageUrl = await page.$eval('meta[property="og:image"]', (el) =>
    el.getAttribute("content")
  );

  if (imageUrl !== null && !/^https:\/\//.test(imageUrl)) {
    const url = await getUrl(page);

    if (url === null) {
      return null;
    }

    if (imageUrl.startsWith("/")) {
      imageUrl = new URL(imageUrl, new URL(url).origin).toString();
    } else {
      imageUrl = path.join(url.toString(), imageUrl);
    }
  }

  return imageUrl;
}

export default handler;
