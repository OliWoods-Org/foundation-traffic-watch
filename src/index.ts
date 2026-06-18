#!/usr/bin/env node
/**
 * foundation-traffic-watch — Human trafficking detection & survivor support.
 * CLI entry: `npm run dev` | `npm start`
 */
export * from "./features/index.js";
export { app } from "./api/routes.js";
export { startServer } from "./server.js";

import { startServer } from "./server.js";

startServer();
// Re-export for programmatic use: import { analyzeAd } from 'foundation-traffic-watch'