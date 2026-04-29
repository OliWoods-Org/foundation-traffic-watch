/**
 * SurvivorSafety — Safety planning and resource connection for
 * trafficking survivors, with anonymous access and trauma-informed design.
 */

import { z } from 'zod';

export const SurvivorSafetyPlanSchema = z.object({
  id: z.string().uuid(), createdAt: z.string().datetime(), onDevice: z.literal(true),
  immediateNeeds: z.object({
    inDanger: z.boolean(), needsShelter: z.boolean(), needsMedical: z.boolean(),
    needsLegal: z.boolean(), needsFood: z.boolean(), hasChildren: z.boolean(),
    isForeign: z.boolean(), hasDocuments: z.boolean(),
  }),
  safetySteps: z.array(z.object({ step: z.number().int(), action: z.string(), resource: z.string().optional(), phone: z.string().optional() })),
  legalRights: z.array(z.object({ right: z.string(), explanation: z.string(), statute: z.string().optional() })),
  resources: z.array(z.object({ name: z.string(), type: z.string(), phone: z.string().optional(), url: z.string().optional(), languages: z.array(z.string()), description: z.string() })),
});

export const SurvivorResourceSchema = z.object({
  id: z.string(), name: z.string(),
  type: z.enum(['shelter', 'legal', 'medical', 'mental_health', 'immigration', 'job_training', 'financial', 'hotline', 'case_management']),
  phone: z.string().optional(), url: z.string().url().optional(),
  location: z.object({ city: z.string(), state: z.string() }).optional(),
  servesForeign: z.boolean(), servesMinors: z.boolean(), servesLGBTQ: z.boolean(),
  languages: z.array(z.string()), confidential: z.boolean(), description: z.string(),
});

export type SurvivorSafetyPlan = z.infer<typeof SurvivorSafetyPlanSchema>;
export type SurvivorResource = z.infer<typeof SurvivorResourceSchema>;

const TRAFFICKING_HOTLINES = [
  { name: 'National Human Trafficking Hotline', phone: '1-888-373-7888', text: 'Text 233733', languages: ['en', 'es', '+200'], description: 'Report tips, get help, 24/7' },
  { name: 'NCMEC (Missing & Exploited Children)', phone: '1-800-843-5678', languages: ['en'], description: 'Report child exploitation' },
  { name: 'NIWAP (Immigration & Women Advocacy)', phone: '1-202-274-4457', languages: ['en', 'es'], description: 'Immigration relief for trafficking survivors' },
];

export function generateSafetyPlan(needs: (typeof SurvivorSafetyPlanSchema)['shape']['immediateNeeds']['_output']): SurvivorSafetyPlan {
  const steps: SurvivorSafetyPlan['safetySteps'] = [];
  let stepNum = 1;

  if (needs.inDanger) {
    steps.push({ step: stepNum++, action: 'Call 911 if in immediate danger', phone: '911' });
    steps.push({ step: stepNum++, action: 'Call National Human Trafficking Hotline', phone: '1-888-373-7888' });
  }
  if (needs.needsMedical) {
    steps.push({ step: stepNum++, action: 'Go to nearest emergency room — you have the right to treatment regardless of ability to pay or immigration status', resource: 'EMTALA guarantees emergency care' });
  }
  if (needs.needsShelter) {
    steps.push({ step: stepNum++, action: 'Call Salvation Army Anti-Trafficking hotline for emergency shelter', phone: '1-800-725-2769' });
  }
  if (needs.isForeign && !needs.hasDocuments) {
    steps.push({ step: stepNum++, action: 'You may qualify for a T-visa (trafficking survivor visa) — you will NOT be deported for seeking help', resource: 'NIWAP: 1-202-274-4457' });
  }
  if (needs.needsLegal) {
    steps.push({ step: stepNum++, action: 'Contact legal aid for free legal representation', resource: 'Legal Services Corporation: lsc.gov' });
  }
  if (needs.hasChildren) {
    steps.push({ step: stepNum++, action: 'Your children can receive services through victim assistance programs', resource: 'Office for Victims of Crime: ovc.ojp.gov' });
  }

  const legalRights: SurvivorSafetyPlan['legalRights'] = [
    { right: 'You are a victim, not a criminal', explanation: 'Federal law recognizes trafficking survivors as victims. Criminal charges related to trafficking can be vacated.', statute: 'TVPA — Trafficking Victims Protection Act' },
    { right: 'Right to emergency services regardless of immigration status', explanation: 'Hospitals must provide emergency treatment. You cannot be denied care.', statute: 'EMTALA' },
    { right: 'Right to immigration relief', explanation: 'T-visa provides legal status for trafficking survivors, even without documents.', statute: 'TVPA Section 107' },
    { right: 'Right to restitution', explanation: 'Courts can order traffickers to pay you for damages.', statute: '18 U.S.C. 1593' },
    { right: 'Right to confidentiality', explanation: 'Service providers cannot share your information without consent.', statute: 'VAWA Confidentiality Provisions' },
  ];

  return {
    id: crypto.randomUUID(), createdAt: new Date().toISOString(), onDevice: true,
    immediateNeeds: needs, safetySteps: steps, legalRights,
    resources: TRAFFICKING_HOTLINES.map(h => ({ ...h, type: 'hotline' as const, confidential: true })),
  };
}

export function matchSurvivorResources(
  needs: Array<SurvivorResource['type']>,
  isForeign: boolean,
  isMinor: boolean,
  language: string,
  resources: SurvivorResource[]
): SurvivorResource[] {
  return resources
    .filter(r => needs.includes(r.type))
    .filter(r => !isForeign || r.servesForeign)
    .filter(r => !isMinor || r.servesMinors)
    .filter(r => r.languages.includes(language) || r.languages.includes('en'))
    .sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      if (a.confidential) scoreA += 10;
      if (b.confidential) scoreB += 10;
      if (a.languages.includes(language)) scoreA += 5;
      if (b.languages.includes(language)) scoreB += 5;
      return scoreB - scoreA;
    });
}
