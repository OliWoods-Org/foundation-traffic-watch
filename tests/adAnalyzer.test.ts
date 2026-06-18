import { describe, it, expect } from 'vitest';
import { analyzeAd, linkAds, analyzePhoneNetwork, ClassifiedAd } from '../src/features/adAnalyzer.js';

const sampleAd = (overrides: Partial<ClassifiedAd> = {}): ClassifiedAd => ({
  id: 'ad-1',
  platform: 'test',
  capturedAt: new Date().toISOString(),
  title: 'New girl in town',
  body: 'Young fresh talent. Cash only. No law enforcement. Manager handles booking.',
  location: 'Atlanta, GA',
  phoneNumbers: ['404-555-0100'],
  ...overrides,
});

describe('analyzeAd', () => {
  it('flags high-risk trafficking language', () => {
    const result = analyzeAd(sampleAd());
    expect(result.riskScore).toBeGreaterThan(25);
    expect(['moderate', 'high', 'critical']).toContain(result.riskLevel);
    expect(result.indicators.length).toBeGreaterThan(0);
  });

  it('returns low risk for benign ads', () => {
    const result = analyzeAd(sampleAd({
      title: 'Used bicycle for sale',
      body: 'Good condition. Pick up downtown.',
      phoneNumbers: ['404-555-0199'],
    }));
    expect(result.riskLevel).toBe('low');
    expect(result.recommendedAction).toBe('monitor');
  });

  it('includes hotline referral for high-risk ads', () => {
    const result = analyzeAd(sampleAd());
    if (result.riskScore >= 50) {
      expect(result.referralInfo?.hotline).toContain('1-888-373-7888');
    }
  });

  it('links ads by shared phone number', () => {
    const target = sampleAd({ id: 'a1', phoneNumbers: ['404-555-0100'] });
    const linked = sampleAd({ id: 'a2', phoneNumbers: ['4045550100'] });
    const links = linkAds(target, [linked]);
    expect(links).toHaveLength(1);
    expect(links[0]?.linkType).toBe('same_phone');
  });
});

describe('analyzePhoneNetwork', () => {
  it('detects multi-city pattern', () => {
    const ads = ['NYC', 'LA', 'Chicago', 'Miami'].map((city, i) =>
      sampleAd({ id: `ad-${i}`, location: city, capturedAt: new Date(Date.now() + i * 1000).toISOString() })
    );
    const network = analyzePhoneNetwork('404-555-0100', ads);
    expect(network.pattern).toBe('multi_city');
    expect(network.riskIndicator).toBe('high_risk');
  });
});