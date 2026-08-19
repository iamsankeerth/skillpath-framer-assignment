# Skillpath Framer Assignment

Skillpath landing page and live Course Catalog for the Webveda junior developer assignment, delivered both as the Vite reference site and as a complete Framer React Code Component.

The current website pairs a GSAP-inspired `Learn Everything` hero with a functional catalog. Course and Pricing Region requests remain independent: when pricing fails, every course stays visible with `Price unavailable` and a dedicated retry action.

## Submission

- [Published Framer site](https://cheerful-board-868178.framer.app/)
- [Public GitHub repository](https://github.com/iamsankeerth/skillpath-framer-assignment)
- [Submission details](./docs/SUBMISSION.md)
- [Shared AI conversation](./docs/AI_CONVERSATION.md) ([conversation website](https://skillpath-framer-assignment-gn2nkffhl-iamsankeerths-projects.vercel.app/))
- [Readable conversation website](./html/conversation.html)
- [Assignment brief](<./docs/Assignment for the junior developer role.pdf>)

I could not embed my complete Codex chat directly in the README, so I exported the conversation and created a small website where reviewers can read the full chat.

## Run Locally

```bash
npm install
npm run dev
```

Production and test checks:

```bash
npm run test
npm run build
npm run qa:conversation
npm run qa:framer
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
- `framer/SkillpathPage.jsx` is the self-contained full-page component copied into Framer.
- `html/framer-preview.html` and `src/framerShim.js` render that exact source locally for verification.
- `index.html` renders the complete AI transcript at the deployed root, with tool calls and outputs expanded.
- `html/skillpath.html` preserves the original Vite Skillpath assignment entry point.
- [Functional plan](./docs/PLAN.md) records the acceptance contract.
- [Domain glossary](./docs/CONTEXT.md) defines project terminology.

## Framer Setup

1. Create a Code Component named `SkillpathPage` in Framer.
2. Replace its source with `framer/SkillpathPage.jsx`.
3. Add it to a page, use Fill or Fixed width, and leave height on Auto.
4. Adjust `Brand Colour` and `Typography` in the property panel.

The component exposes exactly two controls: `Brand Colour` uses `ControlType.Color`; `Typography` uses `ControlType.Font` with family/variant controls while responsive type sizes remain owned by the component. The annotations support flexible or fixed width, auto height, and a preferred intrinsic width of 1200px.

The portable component has no GSAP, Lucide, Three.js, or stylesheet import. Its browser-native animation, styles, data behavior, and SVG art are all contained in the one file. The local build and Playwright harness validate the exact source; final Framer canvas and published-page verification must be completed inside Framer.

Supporting documentation and the original assignment brief are organized under `docs/`.
