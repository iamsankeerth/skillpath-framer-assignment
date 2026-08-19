# Skillpath Framer Implementation Plan

This is the implementation and acceptance contract for the real Skillpath Framer deliverable. The repository keeps the complete, readable source that is imported into Framer.

## Deliverable

- Build the entire page as one self-contained React Code Component: `framer/SkillpathPage.jsx`.
- Include the announcement, responsive navigation, `Learn Everything` hero, both hero artworks, Course Catalog, Why Skillpath band, and footer.
- Use only React, Framer's property-control API, and browser-native APIs in the portable component.
- Keep the existing Vite/React site available as the visual and behavioral reference.

## Framer Sizing

The component must spread Framer's `style` prop onto its root and use these exact annotations:

```js
/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 1200
 */
```

This lets designers use fixed or fluid width, expresses a preferred 1200px canvas width, and lets the complete page determine its own height without clipping or an internal scrollbar.

## Designer Controls

Expose exactly two property controls:

1. `Brand Colour`
   - `ControlType.Color`
   - Default `#0ae448`
   - Drives the announcement, calls to action, focus styling, and restrained accents through a component CSS variable.
2. `Typography`
   - `ControlType.Font`
   - Basic family and variant controls.
   - Font size and text alignment controls remain hidden so the component preserves its responsive hierarchy.

Changing either property must update the page without triggering a Course Catalog or Pricing Region request.

## Hero Art

- Place a broad four-blade orange, peach, pink, and lilac pinwheel above `Learn`.
- Its geometric blades share one center, morph with restrained pointer-driven spring inertia, and settle smoothly instead of spinning continuously.
- Place a layered blue, violet, and pink morphing ribbon near `Everything`.
- Give the ribbon slow non-mechanical path morphing, a subtle idle drift, and restrained pointer parallax.
- Generate unique SVG gradient and filter IDs for every component instance so multiple Framer instances cannot collide.
- Keep both artworks transparent, responsive, touch-friendly, and static when `prefers-reduced-motion` is enabled.

## Live Data Contract

- Fetch `GET /assignment/course-data` and `GET /assignment/country-code` independently and in parallel.
- Use simple credential-free requests, `cache: "no-store"`, independent `AbortController` instances, and 15-second timeouts.
- Validate all response data before rendering. Valid courses require non-empty course strings, non-negative integer INR/USD minor-unit prices, and a boolean `refundable` value.
- Accept Pricing Region values only for `IN` and `US`.
- Cancel requests on unmount or replacement; never retry automatically.

## Catalog Behavior

- Show six stable skeleton cards during the initial Course Catalog request.
- Render all successfully loaded courses as soon as they arrive, even if Pricing Region is still loading or has failed.
- A Pricing Region failure shows `Price unavailable` on every card and exactly one `Retry pricing` action. Never infer INR or USD.
- A Course Catalog failure shows one section-level error and one `Retry courses` action.
- Keep retries independent, prevent duplicate retries, and preserve keyboard focus after the result.
- Show `Course Type`, full descriptions clamped visually to two lines, and `Refundable` only when supplied.
- Search locally over name, description, category, short course, and Course Type.
- Offer Featured, Price Low to High, and Price High to Low stable sorting. Disable price sorting without a valid region.
- Distinguish successful empty, filtered empty, partial failure, and complete failure states.

## Responsive And Accessible Behavior

- Use component-width container queries: one column below 600px, two from 600px, and three from 900px.
- Stack the toolbar below 600px and retain at least 44px interactive targets.
- Keep navigation keyboard-operable and expose a mobile menu at narrow widths.
- Use semantic headings, sections, articles, labels, buttons, status regions, visible focus, and polite result announcements.
- Avoid horizontal overflow and cumulative layout shift.

## Source And Verification

- `framer/SkillpathPage.jsx` is the source of truth copied into Framer.
- `src/framerShim.js` implements only the small local surface needed to import that exact file in Vite.
- `html/framer-preview.html` renders the exact Framer source for local visual and behavior QA.
- `npm run build` must import and compile the component.
- `npm run qa:framer` must verify the two property controls, property updates without data refetching, desktop/mobile behavior, live-data states, search, sorting, unique art, and reduced motion.
- The final release still requires importing the file into Framer itself and checking the canvas, preview, and published page.

## Repository Notes

- `gsap website for Refernce/` is an untracked local reference folder: Git can see it, but it has never been added to repository history. It is deliberately excluded from commits and pull requests because it is research material, not deliverable source.
- Use a stacked pull request based on `feat/learn-everything-hero` so the Framer work is reviewed separately from the Vite implementation.
