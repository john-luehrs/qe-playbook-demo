# QE Metrics & Decisions

Tracking quality signals over time. Use these metrics to identify trends, make
resource decisions, and have evidence-based conversations with stakeholders.

---

## Metrics Dashboard (Sample)

| Metric | Target | Q2 Actual | Q3 Actual | Trend |
|--------|--------|-----------|-----------|-------|
| Escaped defects (to production) | ≤ 2/sprint | 4 | 2 | ↓ Improving |
| Defects caught in QE (pre-release) | Track only | 18 | 22 | ↑ |
| Automation coverage (critical paths) | ≥ 85% | 79% | 86% | ↑ |
| Flaky test rate | < 5% | 11% | 6% | ↓ Improving |
| Mean time to detect (staging) | < 4 hours | 6.2 hrs | 4.1 hrs | ↓ Improving |
| Regression run time (full suite) | < 45 min | 52 min | 47 min | ↓ |
| Bugs fixed without regression test | 0 | 6 | 1 | ↓ Improving |

---

## Decision Log

Decisions that affected QE strategy, tooling, or process — captured so future team members understand the "why."

---

### [DECISION] Adopt contract testing for service integrations

**Date:** Beginning of Q3  
**Decision:** Adopt consumer-driven contract testing (Pact) for all service-to-service integrations, replacing ad hoc integration tests against live services.

**Why:**
- Integration tests against live services were causing 70% of CI instability
- Service teams had no visibility into what consumers were relying on; breaking changes shipped without warning
- Contract tests run in isolation (no network), so they're fast and reliable

**Trade-offs accepted:**
- Upfront cost: all existing integration test coverage needs to be migrated over ~2 sprints
- Requires buy-in from provider teams to run and publish verification results
- Doesn't catch deployment-time environment issues (need smoke tests for that)

**Result:** After 2 sprints, CI flaky rate dropped from 11% to 6%. Provider teams reported fewer panic Slack messages about broken builds.

---

### [DECISION] Retire Selenium suite; replace with Playwright

**Date:** End of Q2  
**Decision:** Retire the existing Selenium-based E2E suite (112 tests) and rewrite E2E coverage in Playwright over the following quarter.

**Why:**
- Selenium suite had accumulated 8 years of tech debt; average run time was 78 minutes
- Flaky rate was 23% — nearly 1 in 4 runs produced false failures
- Playwright's auto-waits and network interception dramatically reduce maintenance burden
- VS Code integration and trace viewer speed up debugging significantly

**Trade-offs accepted:**
- Quarter of parallel coverage while rewrite is in progress
- Decision to rewrite rather than migrate means some edge case knowledge would be lost
- Team needed 3 weeks of ramp-up time on Playwright tooling

**Migration approach:**
- Prioritized by critical path coverage: auth flows first, then checkout, then settings
- Old suite kept running in "informational" mode (non-blocking) during transition
- Any Selenium test not ported within the quarter was retired without replacement unless it had caught a real bug in the past 6 months

**Result:** New Playwright suite (89 tests at end of quarter) runs in 22 minutes with < 3% flake rate.

---

### [DECISION] QE joins sprint planning, not just refinement

**Date:** Q3 Sprint 1  
**Decision:** QE engineer added as required attendee to sprint planning, not just backlog refinement and sprint review.

**Why:**
- Recurring issue: tickets were planned at story points that didn't account for test authoring time
- Features were scoped and committed before QE had reviewed them for testability
- Result was consistent end-of-sprint crunch: devs done, QE still testing at retro time

**Change:**
- QE reviews each story at planning for testability concerns before it's committed to sprint
- QE adds a test-effort estimate; stories where test effort is underestimated are flagged
- Any story with a major testability concern (unclear acceptance criteria, no test hooks, hidden state) is moved back to refinement

**Result:** Sprint overrun rate on QE tasks dropped from 40% of sprints to 10% over the following quarter.

---

## Bug Density by Feature Area (Q3 Sample)

| Feature Area | Bugs Filed | Bugs Escaped | Automation Coverage |
|---|---|---|---|
| Authentication | 3 | 0 | 94% |
| User profile | 7 | 1 | 82% |
| Notifications | 12 | 3 | 61% |
| Billing / payments | 2 | 0 | 91% |
| Search & filtering | 9 | 1 | 74% |
| Admin panel | 5 | 0 | 88% |

**Observation:** Notifications has the highest escape rate and lowest automation coverage. Prioritize coverage improvement in Q4.
