---
title: SiteBuilder
layout: post
---

# SiteBuilder

**SiteBuilder** is a flexible in-memory static site generator built in Typescript, with a modular plugin system. It allows developers to create static websites from markdown, HTML, or custom templating languages, with customizable content pipelines, collections, and build hooks.

## Features

- **Modular Plugin System**: Easily extend the functionality with plugins to integrate new features.
- **Flexible Templating**: Use markdown, HTML, or your preferred templating engine (currently integrated with [eta](https://eta.js.org/)).
- **Dynamic Content Handling**: Generate pages dynamically based on frontmatter and customizable collections.
- **Customizable Build Process**: Hook into the build process at various stages to modify or extend the behavior of the generator.

## Installation
### Prerequisites
- Bun

### Install

```
git clone https://github.com/nijikokun/SiteBuilder.git .
bun install
```

## Building

```
bun run ./index.ts
```

## Deploying with `ngrok` plugin

To use the `ngrok` deploy plugin you will need:

- An [ngrok account](https://dashboard.ngrok.com/)
- A [reserve domain](https://dashboard.ngrok.com/domains/new)
- An [ngrok API key](https://dashboard.ngrok.com/api-keys/new)

Once you have these you should set the following environment variables:

```bash
export NGROK_API_KEY=<your-api-key>
export NGROK_ENDPOINT_URL=https://<your-reserve-domain>
```

Then run:

```bash
bun run ./install
```

## Activity
![Alt](https://repobeats.axiom.co/api/embed/a864ff7bdf9351fd4f23bd0aafad8e6e229799d1.svg "Repobeats analytics image")
