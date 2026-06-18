import { Hono } from "hono";
import { z } from "zod";
import {
  analyzeAd,
  analyzePhoneNetwork,
  ClassifiedAdSchema,
  linkAds,
} from "../features/adAnalyzer.js";
import {
  generateSafetyPlan,
  matchSurvivorResources,
  SurvivorResourceSchema,
  SurvivorSafetyPlanSchema,
} from "../features/survivorSafety.js";
import {
  AnonymousTipSchema,
  triageTip,
  buildNetworkMap,
  generateDossierSummary,
  InvestigationDossierSchema,
} from "../features/investigationAssistant.js";
import { createAlert, AlertRule, shouldSuppress } from "../features/smart-alerts.js";
import { recordMetric, generateImpactReport } from "../features/analytics-engine.js";
import { log } from "../lib/logger.js";

export const app = new Hono();

app.get("/health", (c) =>
  c.json({ status: "ok", service: "foundation-traffic-watch", version: "0.3.0" })
);

app.post("/api/v1/ads/analyze", async (c) => {
  const body = await c.req.json();
  const parsed = ClassifiedAdSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const result = analyzeAd(parsed.data);
  recordMetric("ads.analyzed", 1, "counter");
  if (result.riskLevel === "critical" || result.riskLevel === "high") {
    recordMetric("ads.high_risk", 1, "counter");
  }
  log("info", "Ad analyzed", { adId: parsed.data.id, riskLevel: result.riskLevel });
  return c.json(result);
});

app.post("/api/v1/ads/link", async (c) => {
  const schema = z.object({
    target: ClassifiedAdSchema,
    corpus: z.array(ClassifiedAdSchema),
  });
  const body = await c.req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const linkedAds = linkAds(parsed.data.target, parsed.data.corpus);
  return c.json({ adId: parsed.data.target.id, linkedAds });
});

app.post("/api/v1/phones/analyze", async (c) => {
  const schema = z.object({
    phoneNumber: z.string(),
    ads: z.array(ClassifiedAdSchema),
  });
  const body = await c.req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  return c.json(analyzePhoneNetwork(parsed.data.phoneNumber, parsed.data.ads));
});

const NeedsSchema = SurvivorSafetyPlanSchema.shape.immediateNeeds;

app.post("/api/v1/safety/plan", async (c) => {
  const body = await c.req.json();
  const parsed = NeedsSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const plan = generateSafetyPlan(parsed.data);
  recordMetric("safety.plans_generated", 1, "counter");
  return c.json(plan);
});

app.post("/api/v1/safety/match", async (c) => {
  const schema = z.object({
    needs: z.array(SurvivorResourceSchema.shape.type),
    isForeign: z.boolean(),
    isMinor: z.boolean(),
    language: z.string(),
    resources: z.array(SurvivorResourceSchema),
  });
  const body = await c.req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const matches = matchSurvivorResources(
    parsed.data.needs,
    parsed.data.isForeign,
    parsed.data.isMinor,
    parsed.data.language,
    parsed.data.resources
  );
  return c.json({ matches });
});

app.post("/api/v1/tips/triage", async (c) => {
  const body = await c.req.json();
  const parsed = AnonymousTipSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  const triaged = triageTip(parsed.data);
  recordMetric("tips.triaged", 1, "counter");
  if (triaged.urgency === "life_threatening") {
    recordMetric("tips.life_threatening", 1, "counter");
  }
  log("warn", "Tip triaged", { urgency: triaged.urgency, category: triaged.category });
  return c.json(triaged);
});

app.post("/api/v1/investigations/network", async (c) => {
  const schema = z.object({
    subjects: InvestigationDossierSchema.shape.subjects,
    ads: z.array(
      z.object({ adId: z.string(), phones: z.array(z.string()), location: z.string() })
    ),
  });
  const body = await c.req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  return c.json(buildNetworkMap(parsed.data.subjects, parsed.data.ads));
});

app.post("/api/v1/investigations/summary", async (c) => {
  const body = await c.req.json();
  const parsed = InvestigationDossierSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  return c.json({ summary: generateDossierSummary(parsed.data) });
});

app.post("/api/v1/alerts", async (c) => {
  const schema = z.object({
    rule: AlertRule,
    context: z.record(z.unknown()),
  });
  const body = await c.req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400);

  if (shouldSuppress(parsed.data.rule.id, parsed.data.rule.cooldownMs)) {
    return c.json({ suppressed: true });
  }

  const alert = createAlert(parsed.data.rule, parsed.data.context);
  return c.json(alert);
});

app.get("/api/v1/analytics/report", (c) => {
  const window = (c.req.query("window") ?? "7d") as "1h" | "6h" | "24h" | "7d" | "30d" | "90d" | "1y";
  return c.json(generateImpactReport(window));
});