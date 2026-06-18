import { describe, it, expect } from 'vitest';
import { generateSafetyPlan, matchSurvivorResources } from '../src/features/survivorSafety.js';

describe('generateSafetyPlan', () => {
  it('includes emergency steps when in danger', () => {
    const plan = generateSafetyPlan({
      inDanger: true,
      needsShelter: false,
      needsMedical: false,
      needsLegal: false,
      needsFood: false,
      hasChildren: false,
      isForeign: false,
      hasDocuments: true,
    });
    expect(plan.onDevice).toBe(true);
    expect(plan.safetySteps.some((s) => s.phone === '911')).toBe(true);
    expect(plan.safetySteps.some((s) => s.phone === '1-888-373-7888')).toBe(true);
  });

  it('includes T-visa guidance for foreign survivors without documents', () => {
    const plan = generateSafetyPlan({
      inDanger: false,
      needsShelter: false,
      needsMedical: false,
      needsLegal: false,
      needsFood: false,
      hasChildren: false,
      isForeign: true,
      hasDocuments: false,
    });
    expect(plan.safetySteps.some((s) => s.action.includes('T-visa'))).toBe(true);
  });

  it('always includes legal rights', () => {
    const plan = generateSafetyPlan({
      inDanger: false,
      needsShelter: false,
      needsMedical: false,
      needsLegal: false,
      needsFood: false,
      hasChildren: false,
      isForeign: false,
      hasDocuments: true,
    });
    expect(plan.legalRights.length).toBeGreaterThanOrEqual(4);
  });
});

describe('matchSurvivorResources', () => {
  it('filters by language and foreign status', () => {
    const resources = matchSurvivorResources(
      ['hotline'],
      true,
      false,
      'es',
      [{
        id: 'r1',
        name: 'Spanish Hotline',
        type: 'hotline',
        phone: '1-800-000-0000',
        servesForeign: true,
        servesMinors: true,
        servesLGBTQ: true,
        languages: ['es'],
        confidential: true,
        description: 'Test',
      }]
    );
    expect(resources).toHaveLength(1);
    expect(resources[0]?.name).toBe('Spanish Hotline');
  });
});