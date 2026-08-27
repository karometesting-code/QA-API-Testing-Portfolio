# 🧪 SauceDemo UI Test Automation

End-to-end UI test automation for [SauceDemo](https://www.saucedemo.com/), built with **Playwright** and **TypeScript**, covering the core purchase flow: **login**, **cart**, and **checkout**.

---

## Overview

This project automates the same core purchase flow documented manually in the [Jira + Xray case study](../Jira/README.md), this time as a maintainable, cross-browser test suite following the **Page Object Model (POM)**.

The suite includes:

- Positive and negative login scenarios
- Cart management (add, remove, multi-item)
- Full checkout flow, including a business-rule check on order totals
- Form validation testing on required checkout fields

---

## Technologies

- Playwright Test
- TypeScript
- Page Object Model (POM)
- Custom Playwright Fixtures
- Node.js / npm
- Git

---

## Architecture

Each real screen in the application is modeled as its own **Page Object** — a class exposing locators and action methods, with no assertions inside it. Tests import these page objects (via custom fixtures) and are responsible only for asserting outcomes.

```
Playwright/
├── pages/                        # Page Objects — one class per screen
│   ├── BasePage.ts                # Shared navigation logic
│   ├── LoginPage.ts
│   ├── InventoryPage.ts
│   ├── CartPage.ts
│   ├── CheckoutInfoPage.ts        # Checkout step 1 — shipping info
│   ├── CheckoutOverviewPage.ts    # Checkout step 2 — order review
│   └── CheckoutCompletePage.ts    # Checkout step 3 — confirmation
├── fixtures/
│   ├── users.ts                   # SauceDemo test accounts as typed data
│   └── test-fixtures.ts           # Custom fixtures (page objects + authenticated session)
├── tests/
│   ├── login.spec.ts
│   ├── cart.spec.ts
│   └── checkout.spec.ts
├── playwright.config.ts
└── tsconfig.json
```

---

## Scenarios Covered

### 🔐 Login
- Valid login redirects to the inventory page
- Locked-out user is blocked with an error message
- Incorrect password is rejected
- Empty form submission triggers client-side validation

### 🛒 Cart
- Adding one or multiple products updates the cart badge count
- Removing a product from the inventory page and from the cart page both update state correctly
- Cart contents match exactly what was added
- A fresh session starts with an empty cart

### 💳 Checkout
- Full happy path: cart → shipping info → order review → confirmation
- Order total is mathematically consistent (`subtotal + tax = total`)
- Missing first name / missing postal code both block checkout with the correct validation message

---

## How to Run

```bash
npm install
npx playwright install         # first time only — downloads the browsers

npm test                       # all specs, all 3 browsers (Chromium, Firefox, WebKit)
npm run test:chromium          # single-browser run, faster for local development
npm run test:headed            # watch the browser while it runs
npm run test:ui                # Playwright's interactive UI mode
npm run report                 # opens the last HTML report (traces, screenshots, videos)
```

---

## Skills Demonstrated

- UI Test Automation
- Page Object Model design
- Custom Playwright fixtures
- Cross-browser testing
- Functional, negative, and business-rule assertions
- TypeScript for test automation
- CI-oriented Playwright configuration (retries, tracing, reporting)

---

## Author

**Karen Romero**

QA Engineer Portfolio

GitHub: https://github.com/karometesting-code
