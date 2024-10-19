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
   bun run ./index.ts
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