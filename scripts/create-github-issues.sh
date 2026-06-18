#!/usr/bin/env bash
# Creates 10 epic issues (10 improvements each) for foundation-traffic-watch backlog.
set -euo pipefail

REPO="OliWoods-Org/foundation-traffic-watch"

create_issue() {
  local title="$1"
  local body="$2"
  local labels="$3"
  gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels" 2>/dev/null || \
  gh issue create --repo "$REPO" --title "$title" --body "$body" 2>/dev/null || true
}

# Ensure labels exist
for label in "epic" "tier-1" "tier-2" "tier-3" "tier-4" "tier-5" "tier-6" "mobile" "security" "good-first-issue"; do
  gh label create "$label" --repo "$REPO" --color "8b5cf6" --force 2>/dev/null || true
done

create_issue "[Epic 1/10] Make It Real — Core Platform (Items 1-10)" \
"- [ ] Create src/index.ts entry point
- [ ] Export all 7 feature modules
- [ ] Vitest unit tests for analyzeAd()
- [ ] Tests for generateSafetyPlan()
- [ ] Tests for triageTip()
- [ ] Fix npm run dev
- [ ] GitHub Actions CI
- [ ] ESLint + Prettier
- [ ] REST API layer (Hono)
- [ ] OpenAPI spec" "epic,tier-1"

create_issue "[Epic 2/10] Infrastructure & Data (Items 11-20)" \
"- [ ] Zod API validation
- [ ] Health check endpoint
- [ ] Structured logging with PII redaction
- [ ] .env.example
- [ ] Docker + docker-compose
- [ ] Supabase schema migrations
- [ ] cases/tips/ads tables with RLS
- [ ] Encrypted PII fields
- [ ] Chain-of-custody audit log
- [ ] Security disclosure in CONTRIBUTING" "epic,tier-1,security"

create_issue "[Epic 3/10] Detection Engine (Items 21-30)" \
"- [ ] UNODC-validated indicator patterns
- [ ] Multilingual detection (ES, TL, RU)
- [ ] Image hash deduplication (pHash)
- [ ] linkAds() cross-platform linking
- [ ] Phone normalization (libphonenumber)
- [ ] VoIP/burner detection
- [ ] Geolocation clustering
- [ ] Posting velocity scoring
- [ ] Price anomaly detection
- [ ] Cross-platform poster fingerprinting" "epic,tier-2"

create_issue "[Epic 4/10] Detection Engine Advanced (Items 31-40)" \
"- [ ] Age-indicator NLP model
- [ ] Labor trafficking keyword set
- [ ] NCMEC fast-path referral
- [ ] linkedAds confidence scoring
- [ ] Human-in-the-loop review queue
- [ ] False positive feedback loop
- [ ] PDF dossier export for LE
- [ ] NIBRS tip export format
- [ ] Polaris tip API integration
- [ ] FBI HSI routing by ZIP" "epic,tier-2"

create_issue "[Epic 5/10] Survivor Safety (Items 41-50)" \
"- [ ] Quick-exit button (mobile)
- [ ] On-device safety plan storage
- [ ] State-specific legal rights DB
- [ ] T-visa eligibility wizard
- [ ] U-visa path for DV overlap
- [ ] Shelter finder API
- [ ] Trauma-informed intake form
- [ ] Immigration-safe mode
- [ ] Children's services routing
- [ ] LGBTQ+ resource filter" "epic,tier-3,mobile"

create_issue "[Epic 6/10] Survivor Safety Mobile (Items 51-55)" \
"- [ ] ASL/video relay integration
- [ ] Offline hotline cache
- [ ] Printable wallet safety card
- [ ] Stalkerware detection checklist
- [ ] Burner phone guidance" "epic,tier-3,mobile"

create_issue "[Epic 7/10] Investigation & OSINT (Items 56-65)" \
"- [ ] Network graph visualization
- [ ] Social media cross-reference
- [ ] Public records integration
- [ ] Trafficking hotspot overlay
- [ ] Truck stop pattern detection
- [ ] Supply chain labor audit
- [ ] Tor/onion tip mirror
- [ ] Anonymous tip status tracking
- [ ] Multi-agency referral routing
- [ ] Cryptographic evidence chain" "epic,tier-4"

create_issue "[Epic 8/10] Investigation Advanced (Items 66-70)" \
"- [ ] Case merge/dedup
- [ ] Victim safety auto-escalation
- [ ] Investigator workload balancing
- [ ] Palantir export format
- [ ] UNODC OSINT compliance docs" "epic,tier-4"

create_issue "[Epic 9/10] Mobile App — MAMA iOS (Items 71-85)" \
"- [ ] foundation-traffic-watch in mama-ios
- [ ] Foundation tab Trafficking Watch card
- [ ] Photo ad analysis flow
- [ ] One-tap hotline with cover screen
- [ ] Disguised app icon option
- [ ] Shake-to-alert emergency contact
- [ ] On-device LLM ad analysis
- [ ] Push notifications (opt-in)
- [ ] Biometric lock on safety plans
- [ ] Safari share extension
- [ ] Lock screen hotline widget
- [ ] Voice-to-tip recording
- [ ] Location-blurred reporting
- [ ] TestFlight NGO beta
- [ ] App Store trauma-informed listing" "epic,tier-5,mobile"

create_issue "[Epic 10/10] Platform & Launch (Items 86-100)" \
"- [ ] MCP server for Claude/Grok
- [ ] Slack /trafficking command
- [ ] WhatsApp tip intake
- [ ] Twilio SMS escalation
- [ ] Analytics dashboard
- [ ] Survivor peer matching
- [ ] NGO partner portal
- [ ] LE training module
- [ ] IRB-compliant research export
- [ ] 15-language UI
- [ ] WCAG 2.1 AA audit
- [ ] AGPL compliance check
- [ ] DOJ OVC grant package
- [ ] Impact report for funders
- [ ] v1.0 launch" "epic,tier-6"

echo "Done — 10 epic issues created in $REPO"