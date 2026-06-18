import { describe, it, expect } from 'vitest';
import { triageTip, buildNetworkMap, AnonymousTip } from '../src/features/investigationAssistant.js';

const baseTip = (overrides: Partial<AnonymousTip> = {}): AnonymousTip => ({
  tipId: crypto.randomUUID(),
  receivedAt: new Date().toISOString(),
  source: 'app',
  category: 'suspicious_activity',
  content: 'I noticed suspicious activity at a motel.',
  urgency: 'informational',
  status: 'received',
  ...overrides,
});

describe('triageTip', () => {
  it('escalates life-threatening keywords', () => {
    const result = triageTip(baseTip({ content: 'Please help me, I am being held and cannot leave.' }));
    expect(result.urgency).toBe('life_threatening');
    expect(result.status).toBe('triaged');
    expect(result.triageNotes).toContain('IMMEDIATE');
  });

  it('escalates minor indicators to life-threatening', () => {
    const result = triageTip(baseTip({ content: 'I think there is an underage girl at this location.' }));
    expect(result.urgency).toBe('life_threatening');
    expect(result.triageNotes).toContain('MINOR INDICATORS');
  });
});

describe('buildNetworkMap', () => {
  it('connects subjects to phones and ads', () => {
    const map = buildNetworkMap(
      [{
        id: 'subj-1',
        role: 'suspected_trafficker',
        identifiers: { phoneNumbers: ['404-555-0100'], emails: [], usernames: [], aliases: ['Alias'] },
        locations: [],
      }],
      [{ adId: 'ad-99', phones: ['404-555-0100'], location: 'Atlanta' }]
    );
    expect(map.nodes.length).toBeGreaterThanOrEqual(3);
    expect(map.edges.some((e) => e.relationship === 'posted_by')).toBe(true);
  });
});