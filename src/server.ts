import { serve } from "@hono/node-server";
import { app } from "./api/routes.js";
import { log } from "./lib/logger.js";

const port = Number(process.env.PORT ?? 3847);

export function startServer(): void {
  serve({ fetch: app.fetch, port }, () => {
    log("info", `foundation-traffic-watch API listening on :${port}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}