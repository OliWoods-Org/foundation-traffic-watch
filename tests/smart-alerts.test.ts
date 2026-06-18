import { describe, it, expect } from 'vitest';
import { createAlert, shouldSuppress, AlertRule } from '../src/features/smart-alerts.js';

const rule: AlertRule = {
  id: crypto.randomUUID(),
  name: 'High risk ad detected',
  condition: 'Ad {{adId}} scored {{riskScore}}',
  severity: 'critical',
  channels: ['sms', 'email'],
  cooldownMs: 60000,
  enabled: true,
};

describe('smart-alerts', () => {
  it('creates interpolated alerts', () => {
    const alert = createAlert(rule, { adId: 'ad-1', riskScore: 88, recipientId: 'investigator-1' });
    expect(alert.message).toContain('ad-1');
    expect(alert.message).toContain('88');
    expect(alert.severity).toBe('critical');
  });

  it('suppresses alerts within cooldown window', () => {
    const ruleId = crypto.randomUUID();
    const r: AlertRule = { ...rule, id: ruleId, cooldownMs: 999999 };
    createAlert(r, { recipientId: 'x' });
    expect(shouldSuppress(ruleId, r.cooldownMs)).toBe(true);
  });
});