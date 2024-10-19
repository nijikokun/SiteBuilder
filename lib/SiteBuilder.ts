import { Config } from '../config';
import * as fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { Eta } from 'eta';
import MarkdownIt from 'markdown-it';
import pLimit from 'p-limit';
import * as yup from 'yup';
import * as crypto from 'node:crypto';

export interface Plugin {
    version: string; // Specify the version of the plugin
    initialize?(builder: SiteBuilder): void; // Optional initialize method
    [key: string]: any; // Allow other methods for hooks
}

export interface Page {
    filePath: string;
    frontmatter: Record<string, any>; // Assuming frontmatter can have various properties
    content: string;
    layout: any; // You can type this more specifically if you have a layout structure
    output: string;
    permalinkClean: string;
    permalinkFilesystem: string;
    permalinkAlias: string | null;
}

export interface ContentData {
    includes: Record<string, any>;
    collections: Record<string, any[]>;
    data: Record<string, any>;
    frontmatter?: Record<string, any>;
    content?: string;
}

export class SiteBuilder {
    eta: Eta;
    md: MarkdownIt;
    collections: Record<string, any[]> = {};
    data: Record<string, any> = {};
    includes: Record<string, any> = {};
    private plugins: Plugin[] = [];
    private cache: Map<string, Page> = new Map();

    private frontmatterSchema = yup.object({
        title: yup.string().optional(),
        date: yup.date().optional(),
        draft: yup.boolean().default(false),
        permalink: yup.string().optional(),
        alias: yup.string().optional(),
        tags: yup.array(yup.string()).default([])
    });

    // Method to register plugins
    use(plugin: Plugin) {
        this.plugins.push(plugin);
        // Call initialize on the plugin if it exists
        if (plugin.initialize) {
            this.triggerHook('beforePluginInitialized', plugin);
            plugin.initialize(this); 
            this.triggerHook('afterPluginInitialized', plugin);
        }
    }

    // Trigger a specific hook for all plugins
    private async triggerHook(hookName: string, ...args: any[]): Promise<void> {
        for (const plugin of this.plugins) {
            if (typeof plugin[hookName] === 'function') {
                await plugin[hookName](this, ...args);
            }
        }
    }

    constructor() {
        this.eta = new Eta(); // Initialize template engine
        this.md = new MarkdownIt(); // Initialize markdown renderer
    }
    
    async build() {
        // Load global data from src/data
        await this.loadData(Config.build.src);

        // Load includes from src/includes (with frontmatter parsing)
        await this.loadIncludes(Config.build.src);

        // Load site files from src/site
        const siteFiles = await this.loadSiteFiles(Config.build.src);

        // Notify plugins before build
        await this.triggerHook('beforeBuild');
        
        // Process each site file (frontmatter, content, collections)
        for (const file of siteFiles) {
            await this.processFile(file);
        }

        // Build pages with layouts and collections
        const pages = await this.buildPages(siteFiles);

        // Notify plugins after build
        await this.triggerHook('afterBuild', pages);
        
        // Output pages to memory (later used by plugins)
        return pages;
    }

    // Load data from src/data
    async loadData(basePath: string) {
        const dataDir = path.join(basePath, 'data');
        const dataFiles = await this.loadFiles(dataDir, /\.(json|yaml|yml)$/);
        for (const file of dataFiles) {
            const content = await fs.readFile(file, 'utf-8');
            const ext = path.extname(file);
            let parsedData;
            if (ext === '.json') {
                parsedData = JSON.parse(content);
            } else {
                parsedData = matter(content).data; // YAML
            }
            const dataName = path.basename(file, ext);
            this.data[dataName] = parsedData;
        }
    }

    // Load includes from src/includes and parse frontmatter
    async loadIncludes(basePath: string) {
        const includesDir = path.join(basePath, 'includes');
        const includeFiles = await this.loadFiles(includesDir, /\.(eta|html)$/);
        for (const file of includeFiles) {
            const content = await fs.readFile(file, 'utf-8');
            const { data: frontmatter, content: templateContent } = matter(content); // Parse frontmatter

            const includeName = path.basename(file, path.extname(file));
            this.includes[includeName] = { frontmatter, templateContent };
        }
    }

    // Load files from src/site
    async loadSiteFiles(basePath: string) {
        const siteDir = path.join(basePath, 'site');
        return this.loadFiles(siteDir, /\.(md|html|eta)$/); // Filter supported files
    }

    // Load files from directory recursively
    async loadFiles(directory: string, extFilter: RegExp) {
        const entries = await fs.readdir(directory, { withFileTypes: true });
        const files = await Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                return this.loadFiles(fullPath, extFilter); // Recursively load
            } else if (extFilter.test(fullPath)) {
                return fullPath;
            }
            return null;
        }));
        return files.flat().filter(Boolean); // Flatten and filter null entries
    }

    // Process site file for frontmatter, content, and collections
    async processFile(filePath: string) {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const { data: frontmatter, content } = matter(fileContent);

        try {
            // Validate and throw detailed errors
            await this.frontmatterSchema.validate(frontmatter, { abortEarly: false });
        } catch (validationError) {
            console.warn(`Invalid frontmatter in ${filePath}: ${validationError.errors.join(', ')}`);
            // Stop processing this file if validation fails
            return;
        }

        // Handle collections based on tags
        if (frontmatter.tags) {
            frontmatter.tags.forEach((tag: string) => {
                if (!this.collections[tag]) this.collections[tag] = [];
                this.collections[tag].push({ frontmatter, content, filePath });
            });
        }

        // Optionally handle permalink or alias logic here
        if (frontmatter.permalink) {
            frontmatter.outputPath = frontmatter.permalink; // Assign output location
        }

        if (frontmatter.alias) {
            frontmatter.aliasPath = frontmatter.alias; // Assign alias output path
        }
    }

    async buildPages(siteFiles: string[]): Promise<Page[]> {
        const limit = pLimit(Config.build.concurrencyLimit || 5); // Limit to 5 concurrent promises

        // Build all pages, some might return null
        const pages: (Page | null)[] = await Promise.all(
            siteFiles.map(file => limit(async () => {
                try {
                    return await this.buildPage(file);
                } catch (error) {
                    console.error(`Error processing file ${file}:`, error);
                    return null; // Skip the page if an error occurs
                }
            }))
        );

        // Filter out null values from resulting pages
        return pages.filter((page): page is Page => page !== null);
    }

    // Build pages from site files
    private async buildPage(file: string): Promise<Page | null> {
        // Read the file content once
        const fileContent = await fs.readFile(file, 'utf-8');

        // Generate a hash from the file content
        const fileHash = crypto.createHash('md5').update(fileContent).digest('hex');

        // Check the cache first to avoid reprocessing the file if unchanged
        if (this.cache.has(fileHash)) {
            console.log(`Using cached version for ${file}`);
            return this.cache.get(fileHash)!;
        }

        // Initialize a page object
        let page: Page = {
            filePath: file,
            frontmatter: {},
            content: '',
            layout: null,
            output: '',
            permalinkClean: '',
            permalinkFilesystem: '',
            permalinkAlias: null
        };

        // Hook before building the page
        await this.triggerHook('beforeBuildPage', page);

        // Read the file content and parse the frontmatter
        const { data: frontmatter, content } = matter(fileContent);
        page.frontmatter = frontmatter;
        page.content = content;

        try {
            // Validate and throw detailed errors
            await this.frontmatterSchema.validate(frontmatter, { abortEarly: false });
        } catch (validationError) {
            console.warn(`Invalid frontmatter in ${file}: ${validationError.errors.join(', ')}`);
            // Stop processing this file if validation fails
            return null;
        }

        // Skip draft pages unless explicitly allowed
        if (frontmatter.draft && !this.isDraftBuild()) {
            console.log(`Skipping draft page: ${file}`);
            return null;
        }

        // Hook before rendering the content
        await this.triggerHook('beforeRenderContent', page);

        // Render content (before layout is applied)
        let contentData: ContentData = {
            ...page.frontmatter,
            includes: this.includes,
            collections: this.collections,
            data: this.data
        };
        page.output = this.renderInclude(page.content, contentData);

        // Hook after rendering content
        await this.triggerHook('afterRenderContent', page);

        // Process markdown files based on extension
        page.output = await this.renderContent(file, page.output)

        // If a layout is provided, wrap the content in that layout
        const layoutName = frontmatter.layout || this.data.layout;
        if (layoutName && this.includes[layoutName]) {
            page.layout = this.includes[layoutName];
        
            await this.triggerHook('beforeRenderLayout', page);
        
            const outputFrontmatter = {
                ...page.layout.frontmatter,
                ...page.frontmatter,
            };
        
            contentData = {
                ...outputFrontmatter,
                includes: this.includes,
                collections: this.collections,
                data: this.data,
                content: page.output // Inject the content inside layout
            };
        
            page.output = this.renderInclude(page.layout.templateContent, contentData);
            await this.triggerHook('afterRenderLayout', page);
        }

        // Generate permalinks
        const {
            permalinkClean,
            permalinkFilesystem,
            permalinkAlias
        } = this.generatePermalinkOutputs(file, contentData);

        page.permalinkClean = permalinkClean;
        page.permalinkFilesystem = permalinkFilesystem;
        page.permalinkAlias = permalinkAlias;

        // Hook after building the page
        await this.triggerHook('afterBuildPage', page);

        // Cache the built page to avoid rebuilding it in the future
        this.cache.set(fileHash, page);

        return page;
    }

    private isDraftBuild(): boolean {
        // Logic to determine if drafts should be built
        return process.env.BUILD_DRAFTS === 'true';
    }

    private renderInclude(str: any, contentData: ContentData): string {
        return this.eta.renderString(str, contentData);
    }

    // Render content based on the file type (Markdown or other)
    private renderContent(filename: string, content: string): string {
        if (path.extname(filename) === '.md') {
            return this.renderMarkdown(content); // Use renderMarkdown for .md files
        }

        return content; // Return content as-is for non-Markdown files
    }

    private renderMarkdown(content: string): string {
        return this.md.render(content);
    }

    // Generate permalink outputs
    private generatePermalinkOutputs(filePath: string, data: any): { 
        permalinkClean: string; 
        permalinkFilesystem: string; 
        permalinkAlias: string | null; 
    } {
        const baseDir = path.join(process.cwd(), 'src', 'site'); // Adjust based on your project structure
        const relativePath = path.relative(baseDir, filePath); // Get relative path from base directory
        const fileName = path.basename(relativePath, path.extname(relativePath)); // Get the filename without extension

        // Default values for permalink outputs
        let permalinkClean = '/';
        let permalinkFilesystem = `/${fileName}.html`;
        let permalinkAlias = data.alias ? this.eta.renderString(data.alias, { ...data }) : null; // Render alias if it exists

        // Check if permalink exists and render it, else set defaults
        if (data.permalink) {
            permalinkClean = this.eta.renderString(data.permalink, { ...data });
            permalinkFilesystem = `${permalinkClean.endsWith('/') ? permalinkClean : permalinkClean + '/'}index.html`;
        }

        return { permalinkClean, permalinkFilesystem, permalinkAlias };
    }
}

// Create and use builder
const builder = new SiteBuilder();



builder.build();
