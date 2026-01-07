import path from 'node:path';
import { SiteBuilder, PublicAssets } from '../lib/SiteBuilder';

interface InlineAssetsPluginConfig {
    maxTotalSize?: number;
    maxFileSize?: number;
}

const BINARY_EXTENSIONS: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

export class InlineAssetsPlugin {
    version: string;
    maxTotalSize: number;
    maxFileSize: number;

    constructor(config: InlineAssetsPluginConfig = {}) {
        this.version = '1.0.0';
        this.maxTotalSize = config.maxTotalSize ?? 500 * 1024; // 500KB default
        this.maxFileSize = config.maxFileSize ?? 100 * 1024;   // 100KB per file default
    }

    private isBinaryAsset(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return ext in BINARY_EXTENSIONS;
    }

    private getMimeType(filePath: string): string | undefined {
        const ext = path.extname(filePath).toLowerCase();
        return BINARY_EXTENSIONS[ext];
    }

    private getByteSize(content: string): number {
        return Buffer.byteLength(content, 'utf8');
    }

    async beforeBuild(builder: SiteBuilder): Promise<void> {
        const assets = builder.publicAssets;
        let totalInlinedSize = 0;

        for (const [filePath, asset] of Object.entries(assets)) {
            if (!this.isBinaryAsset(filePath)) continue;

            const content = asset.content;
            const size = this.getByteSize(content);

            if (size > this.maxFileSize) {
                throw new Error(
                    `Asset "${filePath}" (${(size / 1024).toFixed(1)}KB) exceeds max file size of ${(this.maxFileSize / 1024).toFixed(0)}KB`
                );
            }

            if (totalInlinedSize + size > this.maxTotalSize) {
                throw new Error(
                    `Total inlined assets would exceed ${(this.maxTotalSize / 1024).toFixed(0)}KB limit. ` +
                    `Current: ${(totalInlinedSize / 1024).toFixed(1)}KB, adding "${filePath}" (${(size / 1024).toFixed(1)}KB)`
                );
            }

            const mimeType = this.getMimeType(filePath);
            const base64 = Buffer.from(content, 'binary').toString('base64');
            asset.content = `data:${mimeType};base64,${base64}`;
            totalInlinedSize += size;

            console.log(`Inlined "${filePath}" (${(size / 1024).toFixed(1)}KB)`);
        }

        if (totalInlinedSize > 0) {
            console.log(`Total inlined assets: ${(totalInlinedSize / 1024).toFixed(1)}KB / ${(this.maxTotalSize / 1024).toFixed(0)}KB`);
        }
    }
}

export default InlineAssetsPlugin;
