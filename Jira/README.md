# 📋 Jira + Xray QA Case Study

A full manual QA sprint cycle simulated in a live **Jira Cloud** project with **Xray Test Management**, documenting the complete workflow from sprint planning through defect discovery, developer handoff, and verified resolution.

📄 [**QA_Portfolio_Case_Study_Karen.pdf**](QA_Portfolio_Case_Study_Karen.pdf) — full write-up with screenshots from the live Jira project.

---

## Overview

| | |
|---|---|
| **Application under test** | [SauceDemo](https://www.saucedemo.com/) |
| **Sprint** | Sprint 1 — Core Purchase Flow (Login, Cart, Checkout) |
| **Tools** | Jira Cloud + Xray Test Management |
| **Role target** | Quality Engineer |

The case study walks through one complete sprint: scoping the stories to test, designing and organizing tests in Xray, executing them manually, discovering and reporting a defect through exploratory testing, handing it back to development, and verifying the fix.

---

## Scope

- User authentication (TES-1) — 3 story points
- Add to Cart functionality (TES-3) — 3 story points
- Checkout flow (TES-5) — 5 story points

Out of scope for this sprint: product sorting, catalog display, and menu navigation (deferred to Sprint 2).

---

## Process

- **Test organization:** tests kept in Xray's dedicated Test Repository (not mixed into the dev board), organized in sprint-based folders mirroring each story (`Sprint_1 / TES-1`, `Sprint_1 / TES-3`, etc.), plus root-level `Automation` and `Regression` folders reserved for future CI-synced and reusable regression tests.
- **Custom workflow:** an `In QA` state was added between `In Progress` and `Done`, with a `Reopen` transition back to development, to make the dev → QA handoff explicit and trackable.
- **Test planning:** a dedicated Test Plan issue (TES-15) documented objective, scope, environment, and entry/exit criteria, grouping the tests relevant to the sprint.
- **Test execution:** tests were run manually against the live application, with Pass/Fail tracked step-by-step (not just per test) in a Test Execution cycle.

---

## Finding

While executing **TES-14** (complete checkout with a valid standard user), the test was deliberately extended beyond its written script to run against `error_user` — an account known for unstable behavior — as exploratory testing beyond the happy path.

The checkout form and totals calculated correctly through the Overview step, but clicking **Finish** produced no navigation and no error feedback — the order was never confirmed. A secondary, lower-severity issue was also found by inspecting the browser console: repeated failed background analytics calls (`401 Unauthorized`) unrelated to the main defect.

The defect (**TES-7**) was logged with precise reproduction steps, severity/priority classification, and both video and screenshot evidence, linked to the failing test step for full traceability.

---

## Resolution & Verification

- The parent story (**TES-5**) was moved back to `In Progress` via the custom `Reopen` transition, with the defect linked directly on the story — blocking it from being marked complete while the defect remained open.
- Once fixed, a **targeted retest** was run against only the previously failing test (rather than the full suite) — a deliberate, time-efficient regression strategy — before closing the defect and approving the story.

---

## Outcome

- 3/3 committed stories (11 story points) delivered and QA-approved
- 1 high-severity defect found, reported with full evidence, and verified fixed
- 1 additional low-severity defect identified through exploratory testing
- Full traceability maintained: Story → Test → Execution → Defect → Resolution

---

## Skills Demonstrated

- Manual test case design and execution
- Sprint planning and scoping (story points, entry/exit criteria)
- Test management with Jira + Xray
- Exploratory testing beyond scripted steps
- Defect reporting with reproduction steps and evidence
- Dev/QA handoff workflow design (custom Jira states and transitions)
- Targeted regression / retest strategy
- End-to-end traceability (Story → Test → Execution → Defect)

---

## Author

**Karen Romero**

QA Engineer Portfolio — ISTQB Foundation Certified

GitHub: https://github.com/karometesting-code
