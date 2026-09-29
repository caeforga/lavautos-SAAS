import { writeFile } from 'node:fs/promises';
await writeFile('public/sw-assets.js', `self.BRILLO_BUILD='dev-${Date.now()}';\nself.BRILLO_ASSETS=[];\n`);
