import { Config } from './config';
import { SiteBuilder } from './lib/SiteBuilder';
import { ngrokPlugin } from './plugins/ngrok';

// Instantiate SiteBuilder
const builder = new SiteBuilder();

// Add ngrok deployment plugin
builder.use(new ngrokPlugin(Config.plugins.ngrok));

// Start the build process
builder.build();