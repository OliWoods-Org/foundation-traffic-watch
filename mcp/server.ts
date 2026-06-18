#!/usr/bin/env node
/**
 * MCP server for foundation-traffic-watch.
 * Exposes detection, safety, and investigation tools to Claude/Grok.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { analyzeAd, analyzePhoneNetwork, ClassifiedAdSchema, linkAds } from '../src/features/adAnalyzer.js';
import { generateSafetyPlan, SurvivorSafetyPlanSchema } from '../src/features/survivorSafety.js';
import { triageTip, AnonymousTipSchema, buildNetworkMap } from '../src/features/investigationAssistant.js';

const server = new Server(
  { name: 'foundation-traffic-watch', version: '0.3.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'analyze_classified_ad',
      description: 'Analyze a classified ad for human trafficking indicators. Returns risk score, indicators, and recommended action.',
      inputSchema: {
        type: 'object',
        properties: {
          ad: { type: 'object', description: 'Classified ad object with title, body, phoneNumbers, location' },
          corpus: { type: 'array', description: 'Optional related ads for cross-linking' },
        },
        required: ['ad'],
      },
    },
    {
      name: 'generate_safety_plan',
      description: 'Generate a trauma-informed safety plan for trafficking survivors. On-device, privacy-first.',
      inputSchema: {
        type: 'object',
        properties: {
          inDanger: { type: 'boolean' },
          needsShelter: { type: 'boolean' },
          needsMedical: { type: 'boolean' },
          needsLegal: { type: 'boolean' },
          needsFood: { type: 'boolean' },
          hasChildren: { type: 'boolean' },
          isForeign: { type: 'boolean' },
          hasDocuments: { type: 'boolean' },
        },
        required: ['inDanger', 'needsShelter', 'needsMedical', 'needsLegal', 'needsFood', 'hasChildren', 'isForeign', 'hasDocuments'],
      },
    },
    {
      name: 'triage_anonymous_tip',
      description: 'Triage an anonymous tip for urgency. Auto-escalates life-threatening and minor-exploitation cases.',
      inputSchema: {
        type: 'object',
        properties: {
          tip: { type: 'object', description: 'Anonymous tip with content, category, urgency' },
        },
        required: ['tip'],
      },
    },
    {
      name: 'analyze_phone_network',
      description: 'Analyze phone number patterns across multiple ads (burner rotation, multi-city, high volume).',
      inputSchema: {
        type: 'object',
        properties: {
          phoneNumber: { type: 'string' },
          ads: { type: 'array' },
        },
        required: ['phoneNumber', 'ads'],
      },
    },
    {
      name: 'build_investigation_network',
      description: 'Build a network graph connecting subjects, phones, and ads for investigation.',
      inputSchema: {
        type: 'object',
        properties: {
          subjects: { type: 'array' },
          ads: { type: 'array' },
        },
        required: ['subjects', 'ads'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'analyze_classified_ad': {
        const ad = ClassifiedAdSchema.parse((args as Record<string, unknown>).ad);
        const corpus = ((args as Record<string, unknown>).corpus as unknown[]) ?? [];
        const parsedCorpus = corpus.map((a) => ClassifiedAdSchema.parse(a));
        const result = analyzeAd(ad, parsedCorpus);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      }
      case 'generate_safety_plan': {
        const needs = SurvivorSafetyPlanSchema.shape.immediateNeeds.parse(args);
        const plan = generateSafetyPlan(needs);
        return { content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }] };
      }
      case 'triage_anonymous_tip': {
        const tip = AnonymousTipSchema.parse((args as Record<string, unknown>).tip);
        const triaged = triageTip(tip);
        return { content: [{ type: 'text', text: JSON.stringify(triaged, null, 2) }] };
      }
      case 'analyze_phone_network': {
        const { phoneNumber, ads } = args as { phoneNumber: string; ads: unknown[] };
        const parsedAds = ads.map((a) => ClassifiedAdSchema.parse(a));
        const network = analyzePhoneNetwork(phoneNumber, parsedAds);
        return { content: [{ type: 'text', text: JSON.stringify(network, null, 2) }] };
      }
      case 'build_investigation_network': {
        const { subjects, ads } = args as { subjects: unknown[]; ads: unknown[] };
        const map = buildNetworkMap(subjects as never, ads as never);
        return { content: [{ type: 'text', text: JSON.stringify(map, null, 2) }] };
      }
      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);