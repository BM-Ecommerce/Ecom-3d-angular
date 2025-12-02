import 'zone.js/node';

import { APP_BASE_HREF } from '@angular/common';
import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { existsSync } from 'fs';
import { join } from 'path';

import { AppServerModule } from './src/main.server';

// The Express app is exported so that it can be used by serverless Functions.
const BASE_URL = '/visualizer';

export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/visualization/browser');
  const indexHtml = existsSync(join(distFolder, 'index.original.html')) ? 'index.original.html' : 'index';

  // Our Universal express-engine (found @ https://github.com/angular/universal/tree/main/modules/express-engine)
  server.engine('html', ngExpressEngine({
    bootstrap: AppServerModule,
  }));

  server.set('view engine', 'html');
  server.set('views', distFolder);

  // Example Express Rest API endpoints
  // server.get('/api/**', (req, res) => { });
  // Serve static files under the configured base URL (matches baseHref in angular.json)
  server.use(BASE_URL, express.static(distFolder, {
    maxAge: '1y'
  }));
  // Also allow direct asset access without prefix (useful for local dev hits to /)
  server.get('*.*', express.static(distFolder, { maxAge: '1y' }));

  // All regular routes use the Universal engine
  const renderHandler = (req: express.Request, res: express.Response) => {
    const baseHref = req.baseUrl || BASE_URL;
    res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: baseHref }] });
  };

  // Handle routes with and without the base prefix
  server.get([`${BASE_URL}*`, '*'], renderHandler);

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = mainModule && mainModule.filename || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  run();
}

export * from './src/main.server';
