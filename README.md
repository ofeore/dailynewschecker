# Daily News Checker 🗞️

Daily News Checker is a Node.js command-line tool that collects a daily snapshot of live information from multiple public websites.

It uses a headless browser (Puppeteer) to extract headlines and weather data, formats the results for terminal output, and optionally saves a daily text record to disk.

This project focuses on automation, asynchronous control flow, and handling real-world, dynamic websites rather than static APIs.

---

## Features

- **BBC News** – Fetches the current top headline and a short excerpt
- **FXStreet** – Retrieves the leading financial news story
- **Met Office Weather** – Displays today’s weather for London
- **Daily history snapshots** – Saves each run as a dated text file
- **Readable terminal output** – Coloured and formatted console logging
- **Demo mode** – Optional interactive search flow for Met Office

---

## Example Output

```text
Good afternoon! Today is Saturday, 3 January

🗞️ BBC News Top Headline Today:
Reporter in Caracas describes hearing loud bangs and planes
URL: https://www.bbc.co.uk/news/...

(Excerpt of headline)

💰 FX Street Top Story:
Gold Price Annual Forecast: 2026 could see new record-highs...
URL: https://www.fxstreet.com/...

🌡️ Met Office Weather Today in London:
Temperature: 3°C
Condition: Sunny
URL: https://weather.metoffice.gov.uk/forecast/gcpvj0v07
```

_A plain-text version of this output is automatically saved to the `history/` folder._

## Installation & Requirements

- **Node.js** 18+
- **npm**

## Setup

```bash
git clone https://github.com/ofeore/dailynewschecker.git
cd dailynewschecker
npm install
```

## Usage

Standard run (recommended)

```code
node dailynews.mjs
```

Demo mode (demonstrates interactive search and navigation on Met Office)

```code
node dailynews.mjs --search
```

Disable history saving

```code
node dailynews.mjs --no-history
```

---

### Why Puppeteer?

Many of the target sites:

- Render content dynamically
- Change layout frequently
- Do not expose simple public APIs

Using Puppeteer allows this project to:

- Behave like a real browser
- Wait for content to load reliably
- Demonstrate automation and scraping techniques used in production tooling

## Project Goals

This project was built to practise and demonstrate:

- Asynchronous JavaScript (`async` / `await`)
- Browser automation with Puppeteer
- Handling unreliable external systems
- Writing maintainable Node.js CLI tools
- File system interaction and automation workflows

## What I Learned

- Managing async flows across multiple independent tasks
- Dealing with fragile selectors and timeouts in browser automation
- Structuring a Node.js CLI for maintainability
- Designing readable terminal output

## Future Improvements

- Configurable locations for weather
- Automated scheduling (cron)
- Improved error recovery and retries

## Author

**Oliver Feore**
