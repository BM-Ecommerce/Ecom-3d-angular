import 'zone.js/node';
import axios from 'axios';

import { APP_BASE_HREF } from '@angular/common';
import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { environment } from './src/environments/environment';
import { AppServerModule } from './src/main.server';
import { response } from 'express';

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

  // Sitemap Endpoint with Caching
  server.get('/sitemap.xml', async (req, res) => {
    const getproductsdetails = await callBmApi("GET", "getproductsdetails");
    const urls = getproductsdetails?.result?.EcomProductlist ?? [];

    const sitemapEntries = await (await Promise.all(urls.map(async (url: any) => {
      const slug = url.pei_ecomProductName
        .replaceAll(' ', '-')
        .replace(/[^a-zA-Z0-9\-]/g, '')
        .toLowerCase();

      const primaryUrl = `
      <url>
        <loc>${environment.site}/${slug}</loc>
        <priority>0.8</priority>
      </url>
      `;

      const categoryId: null | number = (url.pi_category == 3) ? 5 : (url.pi_category == 5) ? 10 : null;
      const productUrl = await callBmApi("POST", `fabriclistview/${categoryId}/${url.pei_productid}`);


      const secondaryUrls = productUrl.result.map((item: any) => {
        const fabricSlug = item.fabricname
          .replaceAll(' ', '-')
          .replace(/[^a-zA-Z0-9\-]/g, '')
          .toLowerCase();

        const colorSlug = item.colorname
          .replaceAll(' ', '-')
          .replace(/[^a-zA-Z0-9\-]/g, '')
          .toLowerCase();

        return `
      <url>
        <loc>${environment.site}/${slug}/${colorSlug}/${fabricSlug}</loc>
        <priority>0.8</priority>
      </url>
      `;

      }).join("\n");
      return `${primaryUrl} ${secondaryUrls}`;
    }))).join("\n");

    res.send(sitemapEntries);



    res.header("Content-Type", "application/xml");
  });

  // All regular routes use the Universal engine
  const renderHandler = (req: express.Request, res: express.Response) => {
    const baseHref = req.baseUrl || BASE_URL;
    res.render(indexHtml, { req, providers: [{ provide: APP_BASE_HREF, useValue: baseHref }] });
  };

  // Handle routes with and without the base prefix
  server.get([`${BASE_URL}*`, '*'], renderHandler);

  return server;
}



async function callBmApi(method: string, url: string, data: any = {}) {

  const headers = {
    "platform": "Ecommerce",
    "companyname": "ECOMMERCE",
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Ecommercekey": "0d5b2abe-d707-4eb3-a7cb-3f05a5e5d3fb",
    "activity": '{"ipaddress":"","location":"","devicenameversion":"","browsernameversion":""}'
  };

  let response;

  if (method === "GET") {
    response = await axios({
      method,
      url: `https://blindmatrix.software/api/public/api/${url}`,
      headers
    });
  }

  if (method === "POST") {
    response = await axios({
      method,
      url: `https://blindmatrix.software/api/public/api/${url}`,
      headers,
      data: JSON.stringify({
        "showall": true,
        "related_fabric": ""
      })
    });
  }

  return response?.data;
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
