# QE Principles

Core beliefs that guide how this team approaches quality engineering.

---

## 1. Quality is a team sport

Testing is not a gate at the end of the pipeline — it's a thread woven through the entire development process. QE's job is not to catch bugs after they exist, but to make defects harder to introduce in the first place.

**What this means in practice:**
- QE joins sprint planning and refinement, not just review
- Acceptance criteria include testability requirements before work begins
- Developers and QE pair during exploratory testing on high-risk changes
- "Definition of done" explicitly includes test coverage

---

## 2. Signal-to-noise ratio is the metric that matters

A flaky suite is worse than no suite. Every false failure trains people to ignore failures. Before adding a new automated check, ask: is this going to fire accurately, or is it going to create noise that erodes trust in the pipeline?

**What this means in practice:**
- Flaky tests are escalated and fixed before the next sprint — never left to rot
- If a test cannot be made reliably deterministic, use manual verification instead
- Coverage percentage is a vanity metric; coverage of critical paths is the real goal

---

## 3. Test at the right level

End-to-end tests are expensive to write, slow to run, and brittle to maintain. They have their place, but the majority of coverage should live closer to the code.

Use the testing pyramid as a guide:
- **Unit** — logic, edge cases, pure functions
- **Integration** — service contracts, database interactions, API boundaries
- **E2E** — critical user journeys only (login, checkout, activation flows)

---

## 4. Every production incident is a test design failure

If a bug reached users, at least one of the following is true:
1. A test that should have caught it didn't exist
2. A test existed but wasn't being run on the affected path
3. A test existed but wasn't reliable enough to block the release

Post-incident reviews should always include a test strategy question: *what would have caught this earlier?*
