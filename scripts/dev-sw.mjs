import { writeFile } from 'node:fs/promises';
await writeFile('public/sw-assets.js',"self.BRILLO_BUILD='dev-v2';\nself.BRILLO_ASSETS=[];\n");
