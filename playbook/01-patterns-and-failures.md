# QE Patterns & Failure Log

Documented patterns — both effective practices and recurring failure modes
— captured from retrospectives, post-mortems, and sprint reviews.

---

## Entry Format

Each entry is tagged with a type: **FAILURE** (something went wrong) or **SIGNAL** (something that worked).

---

---

## [FAILURE] Skipping regression on "small" config changes

**Sprint / Date:** Q2 Sprint 4  
**Area:** Deployment pipeline, configuration management  
**What happened:**  
A one-line change to a feature flag configuration was deployed without running the regression suite — the change was categorized as "low risk, no code change." The flag interacted with a timing condition introduced three sprints earlier that no one remembered. Fourteen end-to-end tests would have caught the failure. None were run.

**Root cause:**  
The team had an informal heuristic: "if no application code changed, skip regression." This heuristic was never documented and never reviewed. Different people applied it differently.

**Prevention:**  
- Regression threshold is now defined in the deployment runbook, not in people's heads
- Any change to configuration, IaC, or environment variables now triggers the smoke suite at minimum
- The "low risk" label requires explicit sign-off from QE, not developer self-assessment

**Applies to:** All teams using feature flags or environment-driven behavior

---

---

## [FAILURE] Test environment drift masking real failures

**Sprint / Date:** Q3 Sprint 1  
**Area:** Test infrastructure, CI/CD  
**What happened:**  
The staging environment had an older version of a third-party service stub than production. Tests were passing against a stub that didn't enforce a new validation rule introduced by the vendor. The first time real traffic hit the new rule in production, requests started failing.

**Root cause:**  
Stub versions were managed manually and hadn't been reviewed in two sprints. No alerting existed for environment drift between staging and production.

**Prevention:**  
- Stub and mock versions are now pinned in version control alongside application dependencies
- A weekly automated check compares staging vs. production environment manifests and files a ticket on drift
- Integration tests against real APIs are run on a dedicated schedule (weekly, not per-commit) to catch vendor changes

**Applies to:** Any team with third-party dependencies, external services, or shared stubs

---

---

## [SIGNAL] Pre-release pairing sessions catch what automation misses

**Sprint / Date:** Q3 Sprint 3  
**Area:** Exploratory testing practice  
**What worked:**  
The team introduced mandatory 2-hour pairing sessions between QE and the feature developer on any ticket rated medium-risk or above. The sessions run against a staging build, no scripts, no plan — just structured exploration. In the first three sprints using this practice, pairing sessions caught 6 issues that the automated suite had clean-passed.

**Why it works:**  
Developers know the shortcuts and edge states that tests don't exercise. QE brings fresh-eyes perspective and adversarial thinking. Together, they cover a different surface than either would alone.

**Applies to:** New features, major refactors, anything touching user-facing flows with recent changes

---

---

## [FAILURE] Automation coverage misreported due to stale test tagging

**Sprint / Date:** Q4 Sprint 2  
**Area:** Test management, reporting  
**What happened:**  
The coverage dashboard showed 87% of critical paths automated. During a pre-release review, QE manually audited the critical path tags and found that 14 tests tagged as covering "payment flow" hadn't been updated when the payment flow was redesigned four months earlier. They were still running — and still passing — against the old flow that no longer existed in production.

**Root cause:**  
Tests are written and tagged at creation time. No process existed to review or re-validate tag accuracy when features changed. The 87% figure was meaningless.

**Prevention:**  
- Feature redesigns now include a QE task: audit all tagged tests for the changed area
- Quarterly tag review added to QE backlog — automated report flags tests that haven't been modified in 90+ days but cover recently-changed areas
- Coverage dashboards now show "last validated" date alongside percentage

**Applies to:** All teams with test management tooling and coverage dashboards
