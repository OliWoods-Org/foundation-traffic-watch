/**
 * AdAnalyzer — Detect trafficking indicators in online classified ads
 * using linguistic patterns, phone number analysis, and metadata extraction.
 */

import { z } from 'zod';

export const ClassifiedAdSchema = z.object({
  id: z.string(), platform: z.string(), url: z.string().url().optional(),
  capturedAt: z.string().datetime(),
  title: z.string(), body: z.string(), location: z.string(),
  phoneNumbers: z.array(z.string()), images: z.array(z.object({ url: z.string(), hash: z.string().optional() })).optional(),
  postingDate: z.string().optional(), price: z.string().optional(),
  poster: z.object({ username: z.string().optional(), accountAge: z.string().optional(), totalPosts: z.number().int().optional() }).optional(),
});

export const TraffickingIndicatorSchema = z.object({
  adId: z.string(), analyzedAt: z.string().datetime(),
  riskScore: z.number().min(0).max(100),
  riskLevel: z.enum(['low', 'moderate', 'high', 'critical']),
  indicators: z.array(z.object({
    type: z.enum(['language', 'phone_pattern', 'image', 'posting_pattern', 'age_indicator', 'control_indicator', 'location', 'price']),
    indicator: z.string(), evidence: z.string(), weight: z.number().min(0).max(10),
  })),
  linkedAds: z.array(z.object({ adId: z.string(), linkType: z.enum(['same_phone', 'same_image', 'same_poster', 'similar_text']), confidence: z.number() })),
  recommendedAction: z.enum(['monitor', 'flag_for_review', 'priority_investigation', 'immediate_referral']),
  referralInfo: z.object({ hotline: z.string(), tipId: z.string().optional(), agency: z.string() }).optional(),
});

export const PhoneNetworkSchema = z.object({
  phoneNumber: z.string(),
  firstSeen: z.string().datetime(), lastSeen: z.string().datetime(),
  adCount: z.number().int().nonnegative(),
  locations: z.array(z.string()),
  associatedPhones: z.array(z.string()),
  pattern: z.enum(['single_use', 'burner_rotation', 'stable', 'high_volume', 'multi_city']),
  riskIndicator: z.enum(['normal', 'suspicious', 'high_risk']),
});

export type ClassifiedAd = z.infer<typeof ClassifiedAdSchema>;
export type TraffickingIndicator = z.infer<typeof TraffickingIndicatorSchema>;
export type PhoneNetwork = z.infer<typeof PhoneNetworkSchema>;

// Trafficking indicator patterns (research-validated)
const CODED_LANGUAGE_PATTERNS = [
  { pattern: /\bnew\s*(girl|talent|face)\s*in\s*town\b/i, indicator: '"New in town" — common trafficking euphemism', weight: 6 },
  { pattern: /\byoung\b.*\bfresh\b|\bfresh\b.*\byoung\b/i, indicator: 'Youth emphasis — potential minor indicator', weight: 8 },
  { pattern: /\bno\s*law\s*enforcement\b|\bno\s*cops\b|\bno\s*le\b/i, indicator: 'Law enforcement avoidance language', weight: 7 },
  { pattern: /\b(24\s*\/?\s*7|available\s*anytime|always\s*available)\b/i, indicator: '24/7 availability — possible control indicator', weight: 5 },
  { pattern: /\bcash\s*only\b|\bno\s*credit\b/i, indicator: 'Cash-only requirement', weight: 3 },
  { pattern: /\bspecial\b.*\byoung\b|\byoung\b.*\bspecial\b/i, indicator: 'Youth-emphasis language pattern', weight: 7 },
  { pattern: /\bmanager\b|\bbooking\b|\bagent\b|\bhandler\b/i, indicator: 'Third-party management language', weight: 6 },
  { pattern: /\bmust\s*call\b|\btext\s*only\b|\bno\s*email\b/i, indicator: 'Communication restriction — possible control', weight: 4 },
  { pattern: /\bout\s*call\s*only\b|\bin\s*call\b.*\bout\s*call\b/i, indicator: 'Service location patterns', weight: 3 },
  { pattern: /\breal\s*pics\b|\brecent\s*pics\b|\bverified\b/i, indicator: 'Image verification language', weight: 2 },
];

const CONTROL_INDICATORS = [
  { pattern: /\b(rules|requirements|screening)\b/i, indicator: 'Screening/rules language — may indicate organized operation', weight: 4 },
  { pattern: /\b(deposit|booking\s*fee|advance)\b/i, indicator: 'Advance payment requirement — financial control indicator', weight: 5 },
  { pattern: /\b(new\s*number|number\s*change|text\s*this\s*number)\b/i, indicator: 'Phone number rotation — burner phone pattern', weight: 6 },
];

export function analyzeAd(ad: ClassifiedAd): TraffickingIndicator {
  const indicators: TraffickingIndicator['indicators'] = [];
  const fullText = `${ad.title} ${ad.body}`.toLowerCase();

  // Language analysis
  for (const pattern of [...CODED_LANGUAGE_PATTERNS, ...CONTROL_INDICATORS]) {
    if (pattern.pattern.test(fullText)) {
      indicators.push({ type: 'language', indicator: pattern.indicator, evidence: fullText.match(pattern.pattern)?.[0] ?? '', weight: pattern.weight });
    }
  }

  // Phone pattern analysis
  if (ad.phoneNumbers.length > 1) {
    indicators.push({ type: 'phone_pattern', indicator: 'Multiple phone numbers in single ad', evidence: `${ad.phoneNumbers.length} numbers`, weight: 4 });
  }

  // Posting pattern
  if (ad.poster?.totalPosts && ad.poster.totalPosts > 50) {
    indicators.push({ type: 'posting_pattern', indicator: 'High-volume poster', evidence: `${ad.poster.totalPosts} total posts`, weight: 5 });
  }
  if (ad.poster?.accountAge === 'new' || ad.poster?.accountAge === '<7d') {
    indicators.push({ type: 'posting_pattern', indicator: 'New account', evidence: `Account age: ${ad.poster?.accountAge}`, weight: 3 });
  }

  // Score calculation
  const totalWeight = indicators.reduce((s, i) => s + i.weight, 0);
  const riskScore = Math.min(100, totalWeight * 3);
  const riskLevel = riskScore >= 75 ? 'critical' as const : riskScore >= 50 ? 'high' as const : riskScore >= 25 ? 'moderate' as const : 'low' as const;

  const recommendedAction = riskScore >= 75 ? 'immediate_referral' as const
    : riskScore >= 50 ? 'priority_investigation' as const
    : riskScore >= 25 ? 'flag_for_review' as const : 'monitor' as const;

  return {
    adId: ad.id, analyzedAt: new Date().toISOString(), riskScore, riskLevel,
    indicators, linkedAds: [], recommendedAction,
    referralInfo: riskScore >= 50 ? { hotline: 'National Human Trafficking Hotline: 1-888-373-7888', agency: 'Refer to local FBI field office or ICE HSI' } : undefined,
  };
}

export function analyzePhoneNetwork(phoneNumber: string, ads: ClassifiedAd[]): PhoneNetwork {
  const matchingAds = ads.filter(a => a.phoneNumbers.includes(phoneNumber));
  const locations = [...new Set(matchingAds.map(a => a.location))];
  const dates = matchingAds.map(a => a.capturedAt).sort();
  const otherPhones = [...new Set(matchingAds.flatMap(a => a.phoneNumbers).filter(p => p !== phoneNumber))];

  const pattern = matchingAds.length <= 1 ? 'single_use' as const
    : locations.length > 3 ? 'multi_city' as const
    : matchingAds.length > 20 ? 'high_volume' as const
    : otherPhones.length > 3 ? 'burner_rotation' as const : 'stable' as const;

  const riskIndicator = pattern === 'multi_city' || pattern === 'high_volume' ? 'high_risk' as const
    : pattern === 'burner_rotation' ? 'suspicious' as const : 'normal' as const;

  return {
    phoneNumber, firstSeen: dates[0] ?? new Date().toISOString(), lastSeen: dates[dates.length - 1] ?? new Date().toISOString(),
    adCount: matchingAds.length, locations, associatedPhones: otherPhones, pattern, riskIndicator,
  };
}
