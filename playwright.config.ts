import { defineConfig, devices } from '@playwright/test';
process.env.PLAYWRIGHT_BROWSERS_PATH??= '.cache/playwright';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:40000,
 use:{baseURL:'http://127.0.0.1:3000',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[
  {name:'chrome-desktop',use:{...devices['Desktop Chrome'],channel:'chrome'}},
  {name:'chrome-mobile',use:{...devices['Pixel 7'],channel:'chrome'}},
  {name:'webkit-iphone',use:{...devices['iPhone 13']}},
 ],
 webServer:{command:'node .next/standalone/server.js',env:{HOSTNAME:'127.0.0.1',PORT:'3000'},url:'http://127.0.0.1:3000',reuseExistingServer:!process.env.CI,timeout:120000},
});
