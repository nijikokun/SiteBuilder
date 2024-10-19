import CleanCSS from 'clean-css';
import { PublicAssets, SiteBuilder } from '../lib/SiteBuilder';

export class MinifyCSSPlugin {
  version: string = '1.0.0';

  onAssetsLoaded(builder: SiteBuilder, publicAssets: PublicAssets) {
    const css = new CleanCSS();

    // Loop through the public assets and minify CSS files
    for (const [filePath, asset] of Object.entries(publicAssets)) {
      if (filePath.endsWith('.css')) {
        const minified = css.minify(asset.content);

        if (minified.styles) {
          console.log(`Minified CSS: ${filePath}`);
          publicAssets[filePath].content = minified.styles;
        } else {
          console.error(`Could not minify ${filePath}:`, minified.errors);
        }
      }
    }
  }
}

export default MinifyCSSPlugin;
