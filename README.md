# SiteBuilder

**SiteBuilder** is a flexible in-memory static site generator built in TypeScript. Unlike traditional static site generators that output files to disk, SiteBuilder keeps everything in memory and relies on plugins to deploy or output your site.

## How It Works

1. **Load** — Reads data files (YAML/JSON), includes (layouts/partials), public assets, and site content (Markdown/HTML)
2. **Process** — Parses frontmatter, validates schemas, builds collections from tags, and renders templates
3. **Build** — Applies layouts, generates permalinks, and caches pages by content hash
4. **Deploy** — Plugins handle output (e.g., the `ngrok` plugin deploys via Traffic Policy)

### Content Pipeline

```
src/data/*.yaml     → Global data (accessible as `data.filename`)
src/includes/*.eta  → Layouts & partials (with optional frontmatter)
src/public/*        → Static assets (CSS, JS, images)
src/site/*.md       → Pages (Markdown with frontmatter)
```

Pages are processed through:
- **Frontmatter parsing** — YAML metadata (title, date, tags, permalink, layout, draft)
- **Template rendering** — [Eta](https://eta.js.org/) templating with access to `data`, `collections`, and `includes`
- **Markdown conversion** — Via [markdown-it](https://github.com/markdown-it/markdown-it)
- **Layout wrapping** — Content injected into layout templates

### Frontmatter Options

```yaml
---
title: My Page           # Page title
date: 2024-01-15         # Publication date
draft: true              # Exclude from build (unless BUILD_DRAFTS=true)
tags: [blog, tutorial]   # Add to collections
permalink: /custom-url/  # Custom URL path
alias: /old-url/         # Redirect alias
layout: post             # Layout template name
---
```

## Features

- **In-Memory Build** — No disk I/O during build; plugins decide output strategy
- **Plugin Hooks** — `beforeBuild`, `afterBuild`, `beforeRenderContent`, `afterRenderLayout`, and more
- **Collections** — Auto-generated from tags, accessible in templates
- **Caching** — Content-hash based caching skips unchanged pages
- **Concurrent Processing** — Configurable parallelism for large sites

## Installation

### Prerequisites
- [Bun](https://bun.sh/)

### Install

```bash
git clone https://github.com/nijikokun/SiteBuilder.git .
bun install
```

## Building

```bash
bun run build
```

## Deploying with `ngrok` plugin

The `ngrok` plugin deploys your site using [Traffic Policy](https://ngrok.com/docs/traffic-policy/) and Cloud Endpoints. Content is served via the `custom-response` action.

### CEL Expressions

You can use CEL expressions in your content with `${...}` syntax (e.g., `${req.headers['x-custom']}`). To output a literal `${` without it being interpreted as a CEL expression, escape it as `\${`.

### Requirements

To use the `ngrok` deploy plugin you will need:

- An [ngrok account](https://dashboard.ngrok.com/)
- A [reserved domain](https://dashboard.ngrok.com/domains/new)
- An [ngrok API key](https://dashboard.ngrok.com/api-keys/new)

Once you have these you should set the following environment variables:

```bash
export NGROK_API_KEY=<your-api-key>
export NGROK_ENDPOINT_URL=https://<your-reserve-domain>
```

Then run:

```bash
bun run build
```

### Auto-Deploy with GitHub Actions

To automatically deploy on push to `main`, set up a GitHub Environment with your secrets:

1. Go to **Settings → Environments → New environment**
2. Name it (e.g., `production` or your domain)
3. Add secrets:
   - `NGROK_API_KEY` — Your ngrok API key
   - `NGROK_ENDPOINT_URL` — Your endpoint URL (e.g., `https://example.ngrok.app`)

The included workflow at `.github/workflows/deploy.yml` handles the rest:

```yaml
name: build

on:
  push:
    branches:
      - main

jobs:
  build:
    environment: production  # Change to your environment name
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - env:
          NGROK_API_KEY: ${{ secrets.NGROK_API_KEY }}
          NGROK_ENDPOINT_URL: ${{ secrets.NGROK_ENDPOINT_URL }}
        run: bun run build
```

## Directory Structure

```
/
├── src/
│   ├── data/
│   │   └── site.yaml
│   ├── includes/
│   │   └── layout.eta
│   └── site/
│       ├── index.md
├── lib/
│   └── SiteBuilder.ts
├── plugins/
│   └── ngrok.ts
└── config.ts
└── index.ts
```

- `src/` - The source directory for your site content.
  - `data/` - Contains global data files (YAML, JSON) accessible in your templates.
  - `includes/` - Contains layouts and partials used in templates.
  - `public/` - Contains public assets files.
  - `site/` - Contains the main site content (Markdown, HTML, etc.).
- `lib/` - Source code for SiteBuilder lives here.
  - `SiteBuilder.ts` 
- `plugins/` - Site builder plugins directory
  - `ngrok.ts` - Plugin to deploy site to the ngrok platform.
- `config.ts` - Builder and plugin configuration goes here.
- `index.ts` - Entry point for building, add plugins here.

## Plugins

**SiteBuilder** supports a plugin system that allows developers to extend its core functionality. Plugins can hook into the build process at different stages such as `beforeBuild`, `afterBuild`, and more.

### Available Plugins

- `ngrok` - Deploy site to ngrok via Traffic Policy and Cloud Endpoints
- `MinifyCssPlugin` - Minifies CSS files from the `src/public` directory

### Creating your own Plugin

1. Create a typescript file under the `plugins/` directory.
   ```bash
   touch ./plugins/MyPlugin.ts
   ```
2. Implement the Plugin Interface.
   ```typescript
    import { Page, SiteBuilder } from '../lib/SiteBuilder';

    class MyPlugin {
        version: string;

        constructor() {
            this.version = '1.0.0';
        }

        afterBuild(pages: Page[], builder: SiteBuilder): void {
            console.log('Built Pages:');
            pages.forEach(page => {
                console.log(`- ${page.filePath}`);
            });
        }
    }

    export default MyPlugin;
   ```
3. Add it to the entry point.
   ```typescript
   import { MyPlugin } from './plugins/MyPlugin.ts'
   // ...
   builder.use(new MyPlugin());
   ```
4. Run
   ```bash
   bun run build
   ```

#### Plugin Interface

Plugins should implement the following structure:

```typescript
interface Plugin {
  version: string; // Version of the plugin
  initialize?(builder: SiteBuilder): void | Promise<void>;
  beforeBuild?(builder: SiteBuilder): void | Promise<void>;
  afterBuild?(pages: Page[], builder: SiteBuilder): void | Promise<void>;
  // Additional hooks can be defined as needed
}
```

## Activity
![Alt](https://repobeats.axiom.co/api/embed/a864ff7bdf9351fd4f23bd0aafad8e6e229799d1.svg "Repobeats analytics image")


## License

The code in this repository, including the `index.ts`, `config.ts` files, and the `lib/` and `plugins/` directories, is licensed under the MIT License.