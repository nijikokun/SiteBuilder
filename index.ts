import { Config } from './config';
import { SiteBuilder } from './lib/SiteBuilder';
import MinifyCSSPlugin from './plugins/MinifyCSSPlugin';
import { ngrokPlugin } from './plugins/ngrok';

// Instantiate SiteBuilder
const builder = new SiteBuilder();

// Add plugins
builder.use(new MinifyCSSPlugin());
builder.use(new ngrokPlugin(Config.plugins.ngrok));

// Start the build process
builder.build();