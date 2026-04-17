# QE Checklists & Templates

Ready-to-use checklists for common QE activities. Copy, adapt, and make them your own.

---

## Release Readiness Checklist

Use this before signing off on any production release. Customize the thresholds for your team's risk tolerance.

---

### 1. Test Execution

- [ ] Full regression suite run completed on staging or release branch
- [ ] Zero P0/P1 failures (blocking); P2s reviewed and disposition documented
- [ ] Flaky test results reviewed — no new flakiness introduced this cycle
- [ ] Exploratory testing session completed for all new features
- [ ] Performance-sensitive paths benchmarked (response time, throughput) if applicable

### 2. Environment Health

- [ ] Staging environment confirmed up-to-date with release build
- [ ] No open infrastructure alerts on staging at release time
- [ ] Third-party service stubs / mocks confirmed at correct version
- [ ] Database migrations tested against a production-representative data set

### 3. Coverage Verification

- [ ] All acceptance criteria for in-scope tickets have corresponding tests
- [ ] Regression gaps identified and disposition documented (accepted risk or blocked)
- [ ] New test cases added for any bugs fixed this cycle (regression protection)

### 4. Risk and Rollback

- [ ] Risk categories documented: high / medium / low, by area
- [ ] Rollback plan reviewed and confirmed executable (tested or walkthrough-verified)
- [ ] On-call engineer confirmed and briefed on release scope
- [ ] Monitoring/alerting reviewed — new features have appropriate coverage

### 5. Stakeholder Sign-off

- [ ] QE sign-off: __________________ Date: __________
- [ ] Engineering sign-off: __________________ Date: __________
- [ ] Product sign-off: __________________ Date: __________

---

## Bug Report Template

Use this when filing new defects. Consistent format speeds triage.

```
Title: [Component] – [Brief description of observed behavior]

Environment:
  - Build/version:
  - OS/browser:
  - Test environment (staging / pre-prod / local):

Steps to reproduce:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]

Expected result:
[What should happen]

Actual result:
[What did happen]

Frequency: Always / Intermittent / Once
Severity: P0 / P1 / P2 / P3

Attachments:
  - Screenshot or video (if applicable)
  - Logs or console output
  - Network trace (if API/network issue)

Notes:
[Any additional context: related tickets, known workarounds, etc.]
```

---

## Test Case Template

Use this for documenting manual test cases or as the basis for automated ones.

```
Test ID:     TC-[AREA]-[NNN]
Title:       [Descriptive title of what is being tested]
Area:        [Feature / component]
Type:        Functional / Regression / Smoke / Performance / Security
Priority:    P0 / P1 / P2

Preconditions:
  - [Setup state required before test runs]
  - [Data requirements, user state, feature flags, etc.]

Test Steps:
  Step | Action                         | Expected Result
  ---- | ------------------------------ | -------------------------
  1    | [Do something]                 | [Observe something]
  2    | [Do something else]            | [Observe something else]

Pass Criteria:
  [Clear statement of what "pass" means]

Fail Criteria:
  [Clear statement of what "fail" means]

Notes:
  [Edge cases, known limitations, related tests]
```

---

## Sprint Retrospective — QE Focus Questions

Use these to structure the QE voice in sprint retrospectives.

1. What defects escaped to staging or production this sprint? What would have caught them earlier?
2. Did any tests flip from reliable to flaky? What was the cause?
3. Were there features that shipped without adequate test coverage? Why?
4. Did QE get involved early enough in design and refinement? Where could earlier involvement have helped?
5. Is there tech debt in the test suite that needs to be paid down next sprint?
6. What's one thing QE would do differently next sprint?
