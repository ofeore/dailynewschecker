import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

// 
//   Console Styling
// 

const style = {
  green: "\x1b[32m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  italic: "\x1b[3m",
  reset: "\x1b[0m",
};

function addNewline(lines) {
  console.log("\n".repeat(lines));
}

function printUrl(url) {
  console.log(`${style.gray}URL: ${url}${style.reset}`);
}

// 
//  Create History (plain text snapshots)
// 

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveHistorySnapshot(text) {
  const historyDir = path.join(process.cwd(), "history");
  ensureDir(historyDir);

  const filePath = path.join(historyDir, `${isoDate()}.txt`);
  fs.writeFileSync(filePath, text, "utf-8");

  console.log(`${style.gray}Saved: ${filePath}${style.reset}`);
}

function plainGreetingLine() {
  const now = new Date();
  const hour = now.getHours();

  const greeting =
    hour >= 5 && hour < 12
      ? "Good morning"
      : hour >= 12 && hour < 18
      ? "Good afternoon"
      : "Good evening";

  const formattedDate = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return `${greeting}! Today is ${formattedDate}`;
}

function buildPlainSnapshot({ bbc, fx, weather, usedSearchFlow }) {
  const lines = [];

  lines.push(plainGreetingLine());
  if (usedSearchFlow) lines.push("(Met Office: interactive search mode)");
  lines.push("");

  if (bbc) {
    lines.push("BBC News Top Headline Today:");
    lines.push(bbc.headline);
    lines.push(`URL: ${bbc.url}`);
    lines.push("");
    if (bbc.excerpt) lines.push(bbc.excerpt);
    lines.push("");
  } else {
    lines.push("BBC: headline not found");
    lines.push("");
  }

  if (fx) {
    lines.push("FXStreet Top Story:");
    lines.push(fx.title);
    lines.push(`URL: ${fx.url}`);
    lines.push("");
  } else {
    lines.push("FXStreet: headline not found");
    lines.push("");
  }

  if (weather) {
    lines.push("Met Office Weather Today in London:");
    lines.push(`Temperature: ${weather.temperature}`);
    lines.push(`Condition: ${weather.condition}`);
    lines.push(`URL: ${weather.url}`);
    lines.push("");
  } else {
    lines.push("Met Office: weather not found");
    lines.push("");
  }

  return lines.join("\n");
}

// 
//   Config & Helpers
// 

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickIfExists(page, selector) {
  const el = await page.$(selector);
  if (!el) return false;
  try {
    await el.click();
    await delay(500);
    return true;
  } catch {
    return false;
  }
}

// 
//   Browser Setup
// 

async function setupBrowser() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(USER_AGENT);
  page.setDefaultNavigationTimeout(60000);
  page.setDefaultTimeout(30000);

  return { browser, page };
}

// 
//    Greeting (styled)
// 

function getGreetingLine() {
  return `${style.gray}${style.italic}${plainGreetingLine()}${style.reset}`;
}

// 
//   BBC News
// 

async function scrapeBBC(page) {
  await page.goto("https://www.bbc.co.uk/news", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector('div[data-testid="promo"] h3 a');

  const headlineLink = await page.$('div[data-testid="promo"] h3 a');
  if (!headlineLink) {
    return null;
  }

  const url = await headlineLink.evaluate((el) => el.href);
  const headline = await headlineLink.evaluate((el) => el.textContent.trim());

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("article");

  const isLive =
    (await page.$(
      'div[data-testid="live-container-div"] span[class*="LivePulse"]'
    )) !== null;

  let excerpt = "";

  if (isLive) {
    const summaryItems = await page.$$eval("#summaryPoints ul li", (els) =>
      els.slice(0, 2).map((li) => li.textContent.trim())
    );
    excerpt = summaryItems.join(". ");
    if (excerpt && !excerpt.endsWith(".")) excerpt += ".";
  } else {
    const paragraphs = await page.$$eval("article p", (els) =>
      els.map((el) => el.textContent.trim())
    );

    const firstSentence =
      paragraphs
        .join(" ")
        .split(".")
        .map((s) => s.trim())
        .filter(Boolean)[0] || "";

    excerpt = firstSentence ? `${firstSentence}.` : "";
  }

  return { headline, url, excerpt };
}

function logBBC(bbc) {
  console.log(`${style.blue}🗞️  BBC News Top Headline Today:${style.reset}`);
  console.log(bbc.headline);
  printUrl(bbc.url);
  addNewline(1);
  if (bbc.excerpt) console.log(bbc.excerpt);
}

// 
//   FXStreet
// 

async function scrapeFXStreet(page) {
  await page.goto("https://www.fxstreet.com/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await clickIfExists(page, "p.fc-button-label");
  await clickIfExists(page, 'button[data-slot="dialog-close"]');
  await clickIfExists(page, "#onesignal-slidedown-cancel-button");

  const headlineSelector =
    'h2 a[href^="https://www.fxstreet.com/"],' +
    'h3 a[href^="https://www.fxstreet.com/"],' +
    'h4 a[href^="https://www.fxstreet.com/"]';

  await page.waitForSelector(headlineSelector, { timeout: 60000 });

  const headlineLink = await page.$(headlineSelector);
  if (!headlineLink) return null;

  const url = await headlineLink.evaluate((el) => el.href);
  const title = await headlineLink.evaluate((el) => el.textContent.trim());

  return { title, url };
}

function logFXStreet(fx) {
  console.log(`${style.red}💰 FX Street Top Story:${style.reset}`);
  console.log(fx.title);
  printUrl(fx.url);
}

// 
//   Met Office Weather
// 

async function scrapeWeather(page, useSearchFlow) {
  if (useSearchFlow) {
    console.log(
      `${style.gray}${style.italic}(Demo mode: using interactive Met Office search)${style.reset}`
    );

    await page.goto("https://www.metoffice.gov.uk/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await clickIfExists(page, "#ccc-recommended-settings");

    const searchInput = await page.waitForSelector("#location-search-input", {
      timeout: 30000,
    });

    await searchInput.click({ clickCount: 3 });
    await searchInput.type("London (Greater London)");

    const searchButton = await page.$("#location-search-submit");
    if (searchButton) await searchButton.click();

    await page.waitForFunction(() => location.href.includes("/forecast/"), {
      timeout: 30000,
    });
  } else {
    await page.goto("https://weather.metoffice.gov.uk/forecast/gcpvj0v07", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  }

  await page.waitForSelector('span[data-unit="temperature"][aria-hidden="true"]', {
    timeout: 30000,
  });
  await page.waitForSelector("div.heading-l", { timeout: 30000 });

  const temperature = await page.$eval(
    'span[data-unit="temperature"][aria-hidden="true"]',
    (el) => el.textContent.trim()
  );

  const condition = await page.$eval("div.heading-l", (el) =>
    el.textContent.trim()
  );

  return { temperature, condition, url: page.url() };
}

function logWeather(weather) {
  console.log(
    `${style.green}🌡️  Met Office Weather Today in London:${style.reset}`
  );
  console.log(`Temperature: ${weather.temperature}`);
  console.log(`Condition: ${weather.condition}`);
  printUrl(weather.url);
}

// 
//   Main function
// 

async function main() {
  const useSearchFlow = process.argv.includes("--search");
  const saveHistory = !process.argv.includes("--no-history");

  const { browser, page } = await setupBrowser();

  // Capture results to write a clean plain-text snapshot
  let bbc = null;
  let fx = null;
  let weather = null;

  try {
    console.log(getGreetingLine());
    addNewline(2);

    bbc = await scrapeBBC(page);
    if (bbc) {
      logBBC(bbc);
    } else {
      console.log("❌ BBC: headline not found");
    }

    addNewline(2);

    try {
      fx = await scrapeFXStreet(page);
      if (fx) logFXStreet(fx);
      else console.log("❌ FXStreet: headline not found");
    } catch {
      console.log("❌ FXStreet section failed (skipping).");
      printUrl(page.url());
      fx = null;
    }

    addNewline(2);

    weather = await scrapeWeather(page, useSearchFlow);
    logWeather(weather);

    addNewline(1);

    if (saveHistory) {
      const snapshot = buildPlainSnapshot({
        bbc,
        fx,
        weather,
        usedSearchFlow: useSearchFlow,
      });

      saveHistorySnapshot(snapshot);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  process.exit(1);
});
