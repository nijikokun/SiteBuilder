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

## Activity
![Alt](https://repobeats.axiom.co/api/embed/a864ff7bdf9351fd4f23bd0aafad8e6e229799d1.svg "Repobeats analytics image")
