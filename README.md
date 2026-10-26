# Multi RSS — Open-Source RSS Feed Aggregator

**Multi RSS** is a lightweight, open-source RSS feed aggregator that collects content from multiple websites and displays it in chronological order on a single page.

Built on **Cloudflare Workers**, this project provides an alternative to hosting an RSS aggregation service on your own server. It is suitable for developer communities, blogging networks, technology publications, and anyone who wants to bring updates from multiple RSS or Atom feeds into one place.

Inspired by projects such as [Planet](https://en.wikipedia.org/wiki/Planet_(software)) and [MoonMoon](https://moonmoon.org/), Multi RSS makes it easier to follow content published across multiple websites through a centralized feed.

## Key Features

- **Multiple RSS and Atom Feeds:** Aggregate content from a configurable list of sources.
- **Chronological Content:** Display collected articles and updates in chronological order.
- **Cloudflare Workers:** Deploy the application using Cloudflare's serverless platform.
- **Cloudflare KV Storage:** Use KV namespaces to support the application's data storage and caching workflow.
- **Configurable Feed Page:** Customize the page title, description, feed sources, and maximum number of entries.
- **Customizable HTML Templates:** Adapt the generated page to match your website or community identity.
- **Open-Source Software:** Explore the code, deploy your own instance, and customize it for your needs.

## Use Cases

Multi RSS can serve as the foundation for:

- Developer community news aggregators.
- Personal blog and website collections.
- Open-source project activity pages.
- Technology news and industry resource hubs.
- Curated RSS reading dashboards.
- Community portals that showcase members' published content.

By consolidating multiple feeds into one page, Multi RSS helps readers discover updates without visiting every source individually.

## Built by Kome Studio

[Kome Studio](https://komestudio.com/) explores digital products, casual games, creative technology, and practical software projects. We are interested in building useful digital experiences that help people discover, create, and enjoy content online.

Discover more projects and ideas across the Kome ecosystem at [Kome.top](https://kome.top/).

## How to deploy

1. Clone this repository.
2. Install the project dependencies: `npm install`.
3. Create a `wrangler.toml` file based on the existing `wrangler.toml.example`.
4. Create KV namespaces and add their IDs to the `kv_namespaces` setting in `wrangler.toml`.
5. Add your `account_id` and customize the variables in `wrangler.toml`. Set `FEEDS` to a comma-separated list of RSS or Atom feed URLs.
6. Build the Worker bundle: `npm run build`.
7. Deploy your Worker: `npm run deploy`.

**Note:** You may need to configure the `CLOUDFLARE_API_TOKEN` environment variable before deploying.

## Configuration variables

- **FEEDS** — A comma-separated list of RSS or Atom feed URLs used as content sources.
- **TITLE** — The name of your feed aggregation page. It appears in the generated HTML page and RSS feed.
- **DESCRIPTION** — A text description for the page. Note that this variable is not currently used in the included template.
- **MAX_SIZE** — The maximum number of posts or entries included on the page and in the feed.
- **CACHE_MAX_AGE** — The cache lifetime in seconds. Adjust this value according to your scheduled refresh frequency. Default: `3600`.

## Project Links

- **Kome Studio:** https://komestudio.com/
- **Kome Project Hub:** https://kome.top/
- **Source Code:** https://github.com/KomeStudio/multi-rss

Explore the project, customize it for your community, and build your own RSS feed aggregation experience with Cloudflare Workers.

**Kome Studio — Building useful digital experiences, one project at a time.**