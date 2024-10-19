import yaml from 'js-yaml';
import path from 'node:path';
import { Page, SiteBuilder, PublicAssets } from '../lib/SiteBuilder';

interface ngrokTrafficPolicyRule {
    expressions?: string[],
    actions: {
        type: string
        config: any
    }[]
}

interface ngrokPluginConfigOptions {
    api_url?: string,
    api_key?: string,
    endpoint: {
        url?: string,
    }
}

interface ngrokPluginConfig {
    api_url: string,
    api_key: string,
    endpoint: {
        url: string,
    }
}

export class ngrokPlugin {
    config: ngrokPluginConfig;
    version: string;

    constructor(config: ngrokPluginConfigOptions) {
        this.version = '1.0.0'

        this.config = {
            api_url: config.api_url || 'https://api.ngrok.com',
            api_key: config.api_key || '',
            endpoint: {
                url: config.endpoint.url || ''
            }
        };
    }

    // Method to create a traffic policy in YAML format
    private generateTrafficPolicy(pages: Page[], assets: PublicAssets): string {
        const policy = {
            on_http_request: [
                // Generate custom-response rules for public assets
                ...Object.entries(assets).map(([filepath, asset]) => {
                    const rule: ngrokTrafficPolicyRule = {
                        expressions: [`req.url.path == '/${filepath}'`],
                        actions: [
                            {
                                type: 'custom-response',
                                config: {
                                    status_code: 200,
                                    content: asset.content,
                                    headers: {
                                        'content-type': this.getContentType(filepath) || 'text/plain'
                                    }
                                }
                            }
                        ]
                    };
                    return rule;
                }),
                ...pages.map(page => {
                    const rule: ngrokTrafficPolicyRule = {
                        expressions: [],
                        actions: []
                    };

                    const noTrailingSlashCondition = `req.url.path == '${page.permalinkClean}'`
                    const trailingSlashCondition = page.permalinkClean == '/' ? '' : `req.url.path == '${page.permalinkClean}/'`
                    const aliasCondition = page.permalinkAlias ? `req.url.path == '${page.permalinkAlias}'` : '';

                    rule.expressions = page.frontmatter.policy_expressions || [
                        [
                            noTrailingSlashCondition,
                            trailingSlashCondition,
                            aliasCondition
                        ].filter(Boolean).join(' || ')
                    ];

                    rule.actions = [
                        ...(page.frontmatter.policy_actions || []),
                        {
                            type: 'custom-response',
                            config: {
                                status_code: page.frontmatter.policy_status_code || 200,
                                content: page.output,
                                headers: page.frontmatter.policy_headers || {
                                    'content-type': 'text/html'
                                }
                            }
                        }
                    ]

                    return rule
                })
            ]
        };

        // Convert the policy to YAML
        return yaml.dump(policy);
    }

    // Method to fetch all endpoints and find the one matching the URL
    private async findEndpointByUrl(url: string): Promise<string | null> {
        const response = await fetch(`${this.config.api_url}/endpoints`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.config.api_key}`,
                'Content-Type': 'application/json',
                'ngrok-Version': '2'
            }
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Error fetching endpoints:', data);
            return null;
        }

        const endpoint = data.endpoints.find((ep: any) => ep.url === url);
        return endpoint ? endpoint.id : null;
    }

    // Method to create a cloud endpoint using the traffic policy
    private async createCloudEndpoint(trafficPolicy: string, url: string): Promise<void> {
        const response = await fetch(`${this.config.api_url}/endpoints`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.api_key}`,
                'Content-Type': 'application/json',
                'ngrok-Version': '2'
            },
            body: JSON.stringify({
                url,
                type: 'cloud',
                traffic_policy: trafficPolicy,
                bindings: ['public']
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Cloud endpoint created with ID:', data.id);
        } else {
            console.error('Error creating cloud endpoint:', data);
        }
    }

    // Method to update a cloud endpoint
    private async updateCloudEndpoint(trafficPolicy: string, endpointId: string): Promise<void> {
        const response = await fetch(`${this.config.api_url}/endpoints/${endpointId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${this.config.api_key}`,
                'Content-Type': 'application/json',
                'ngrok-Version': '2'
            },
            body: JSON.stringify({
                traffic_policy: trafficPolicy
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Cloud endpoint updated:', endpointId);
        } else {
            console.error('Error updating cloud endpoint:', data);
        }
    }

    // Create or update an ngrok cloud endpoint
    private async createOrUpdateCloudEndpoint(trafficPolicy: string, url: string): Promise<void> {
        const existingEndpointId = await this.findEndpointByUrl(url);

        if (existingEndpointId) {
            console.log(`Endpoint found for URL: ${url}. Updating endpoint...`);
            await this.updateCloudEndpoint(trafficPolicy, existingEndpointId);
        } else {
            console.log(`No existing endpoint found for URL: ${url}. Creating new endpoint...`);
            await this.createCloudEndpoint(trafficPolicy, url);
        }
    }

    // Helper method to determine content type based on file extension
    private getContentType(filePath: string): string | undefined {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.html': return 'text/html';
            case '.css': return 'text/css';
            case '.js': return 'application/javascript';
            case '.json': return 'application/json';
            case '.txt': return 'text/plain';
            default: return undefined;
        }
    }

    // Hook into SiteBuilder's afterBuild hook to generate or update cloud endpoint
    async afterBuild(builder: SiteBuilder, pages: Page[]) {
        // Access public assets
        const assets = builder.publicAssets;

        // Generate a basic traffic policy using page URLs and public assets
        const trafficPolicy = this.generateTrafficPolicy(pages, assets);
        // console.log(trafficPolicy)

        // Either create or update the cloud endpoint
        await this.createOrUpdateCloudEndpoint(trafficPolicy, this.config.endpoint.url);
    }
}

export default ngrokPlugin;
