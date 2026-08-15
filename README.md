# Skillpath Framer Assignment

Work-in-progress Skillpath landing page and live Course Catalog for the Webveda junior developer assignment.

The current website pairs a GSAP-inspired `Learn Everything` hero with a functional catalog. Course and Pricing Region requests remain independent: when pricing fails, every course stays visible with `Price unavailable` and a dedicated retry action.

## Run Locally

```bash
npm install
npm run dev
```

Production and test checks:

```bash
npm run test
npm run build
```

## Current Features

- Responsive, motion-led hero with reduced-motion support
- Live Course Catalog and Pricing Region requests
- Runtime response validation and 15-second request timeouts
- Independent course and pricing retry actions
- Local search across course content and Course Type
- Featured and stable price sorting
- INR and USD minor-unit formatting without currency assumptions
- Loading, failure, empty, filtered-empty, and partial-success states
- One, two, and three-column container-responsive course layouts

## Source Map

- `src/Hero.jsx` contains the hero structure, menu, and GSAP motion.
- `src/CourseCatalog.jsx` owns catalog state and interaction behavior.
- `src/courseData.js` contains API, validation, search, sorting, and price helpers.
- `src/styles.css` contains the current CSS-variable design layer.
- [Functional plan](./PLAN.md) records the acceptance contract.
- [Domain glossary](./CONTEXT.md) defines project terminology.

## Delivery Status

The local website builds and tests independently. Final Tailwind v4 tokens, final design values, the Framer property-control wrapper, Framer import verification, and published-page QA remain before submission.

The original assignment brief is intentionally not included in this public repository.
