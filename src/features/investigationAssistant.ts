/**
 * InvestigationAssistant — Generate investigation dossiers from public data,
 * cross-reference cases, and manage anonymous tip processing.
 */

import { z } from 'zod';

export const InvestigationDossierSchema = z.object({
  dossierId: z.string().uuid(), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
  caseType: z.enum(['sex_trafficking', 'labor_trafficking', 'child_exploitation', 'forced_marriage', 'organ_trafficking', 'unknown']),
  status: z.enum(['preliminary', 'active', 'referred', 'closed']),
  subjects: z.array(z.object({
    id: z.string(), role: z.enum(['suspected_trafficker', 'suspected_victim', 'facilitator', 'buyer', 'witness', 'unknown']),
    identifiers: z.object({ phoneNumbers: z.array(z.string()), emails: z.array(z.string()), usernames: z.array(z.string()), aliases: z.array(z.string()) }),
    locations: z.array(z.object({ location: z.string(), firstSeen: z.string(), lastSeen: z.string() })),
  })),
  evidence: z.array(z.object({
    id: z.string(), type: z.enum(['ad', 'phone_record', 'image', 'tip', 'public_record', 'social_media']),
    description: z.string(), capturedAt: z.string(), source: z.string(),
    chainOfCustody: z.array(z.object({ action: z.string(), actor: z.string(), timestamp: z.string() })),
  })),
  networkMap: z.object({
    nodes: z.array(z.object({ id: z.string(), type: z.string(), label: z.string() })),
    edges: z.array(z.object({ from: z.string(), to: z.string(), relationship: z.string(), strength: z.number() })),
  }),
  riskAssessment: z.object({
    victimSafetyRisk: z.enum(['low', 'moderate', 'high', 'immediate']),
    evidenceStrength: z.enum(['weak', 'moderate', 'strong', 'compelling']),
    networkSize: z.enum(['individual', 'small_network', 'organized', 'enterprise']),
  }),
  recommendations: z.array(z.object({ priority: z.number().int(), action: z.string(), assignTo: z.string(), deadline: z.string().optional() })),
});

export const AnonymousTipSchema = z.object({
  tipId: z.string().uuid(), receivedAt: z.string().datetime(),
  source: z.enum(['hotline', 'web_form', 'text', 'app', 'social_media']),
  category: z.enum(['sex_trafficking', 'labor_trafficking', 'child_exploitation', 'suspicious_activity', 'request_for_help', 'other']),
  content: z.string(),
  locationInfo: z.string().optional(),
  suspectInfo: z.string().optional(),
  victimInfo: z.string().optional(),
  urgency: z.enum(['informational', 'moderate', 'urgent', 'life_threatening']),
  status: z.enum(['received', 'triaged', 'assigned', 'investigating', 'resolved', 'unfounded']),
  assignedTo: z.string().optional(),
  triageNotes: z.string().optional(),
});

export type InvestigationDossier = z.infer<typeof InvestigationDossierSchema>;
export type AnonymousTip = z.infer<typeof AnonymousTipSchema>;

const URGENCY_KEYWORDS = {
  life_threatening: ['help me', 'being held', 'cannot leave', 'please help', 'hurting', 'child', 'minor', 'underage', 'kidnap', 'gun', 'weapon'],
  urgent: ['scared', 'trapped', 'forced', 'threat', 'escape', 'afraid', 'danger', 'abuse'],
  moderate: ['suspicious', 'concerned', 'think', 'believe', 'noticed', 'seen'],
};

export function triageTip(tip: AnonymousTip): AnonymousTip {
  const contentLower = tip.content.toLowerCase();

  // Auto-assess urgency from content
  let assessedUrgency = tip.urgency;
  for (const keyword of URGENCY_KEYWORDS.life_threatening) {
    if (contentLower.includes(keyword)) { assessedUrgency = 'life_threatening'; break; }
  }
  if (assessedUrgency !== 'life_threatening') {
    for (const keyword of URGENCY_KEYWORDS.urgent) {
      if (contentLower.includes(keyword)) { assessedUrgency = 'urgent'; break; }
    }
  }

  // Check for minor indicators
  const minorIndicators = /\b(child|minor|underage|teen|teenager|young\s*girl|young\s*boy|1[0-7]\s*year)/i;
  if (minorIndicators.test(tip.content)) {
    assessedUrgency = 'life_threatening';
  }

  const triageNotes = [
    `Auto-triage assessment: ${assessedUrgency}`,
    assessedUrgency === 'life_threatening' ? 'IMMEDIATE: Route to law enforcement' : '',
    minorIndicators.test(tip.content) ? 'MINOR INDICATORS DETECTED — priority referral to NCMEC' : '',
    tip.locationInfo ? `Location provided: ${tip.locationInfo}` : 'No location provided — follow up needed',
  ].filter(Boolean).join('. ');

  return {
    ...tip,
    urgency: assessedUrgency,
    status: 'triaged',
    triageNotes,
  };
}

export function buildNetworkMap(
  subjects: InvestigationDossier['subjects'],
  ads: Array<{ adId: string; phones: string[]; location: string }>
): InvestigationDossier['networkMap'] {
  const nodes: InvestigationDossier['networkMap']['nodes'] = [];
  const edges: InvestigationDossier['networkMap']['edges'] = [];

  // Add subject nodes
  for (const subject of subjects) {
    nodes.push({ id: subject.id, type: subject.role, label: subject.identifiers.aliases[0] ?? subject.id });

    // Phone-based connections
    for (const phone of subject.identifiers.phoneNumbers) {
      const phoneNodeId = `phone_${phone}`;
      if (!nodes.find(n => n.id === phoneNodeId)) {
        nodes.push({ id: phoneNodeId, type: 'phone', label: phone });
      }
      edges.push({ from: subject.id, to: phoneNodeId, relationship: 'uses_phone', strength: 1 });

      // Link to ads
      for (const ad of ads) {
        if (ad.phones.includes(phone)) {
          const adNodeId = `ad_${ad.adId}`;
          if (!nodes.find(n => n.id === adNodeId)) {
            nodes.push({ id: adNodeId, type: 'ad', label: `Ad ${ad.adId}` });
          }
          edges.push({ from: phoneNodeId, to: adNodeId, relationship: 'posted_by', strength: 0.8 });
        }
      }
    }
  }

  return { nodes, edges };
}

export function generateDossierSummary(dossier: InvestigationDossier): string {
  const suspectedTraffickers = dossier.subjects.filter(s => s.role === 'suspected_trafficker').length;
  const suspectedVictims = dossier.subjects.filter(s => s.role === 'suspected_victim').length;

  return [
    `INVESTIGATION DOSSIER: ${dossier.dossierId}`,
    `Type: ${dossier.caseType.replace('_', ' ')} | Status: ${dossier.status}`,
    `Subjects: ${dossier.subjects.length} (${suspectedTraffickers} suspected traffickers, ${suspectedVictims} suspected victims)`,
    `Evidence items: ${dossier.evidence.length}`,
    `Network: ${dossier.networkMap.nodes.length} nodes, ${dossier.networkMap.edges.length} connections`,
    `Risk: Victim safety=${dossier.riskAssessment.victimSafetyRisk}, Evidence=${dossier.riskAssessment.evidenceStrength}, Scale=${dossier.riskAssessment.networkSize}`,
    `Priority actions: ${dossier.recommendations.map(r => r.action).join('; ')}`,
  ].join('\n');
}
