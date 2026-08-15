# Skillpath Functional Plan

This plan defines the agreed functional behavior for the Skillpath Framer assignment. It is the implementation checklist and acceptance contract. Visual design, palette selection, and hero composition are deliberately deferred.

## Product Scope

- Build one published Framer landing page for Skillpath.
- Keep the hero and footer as native Framer layers.
- Build one self-contained `CourseCatalog` React code component for all live-data behavior.
- Use plain JavaScript with concise JSDoc types and runtime response validation.
- Use only React, Framer, and browser-native APIs in production.
- Include search, price sorting, skeleton loading, retry actions, and a conditional refundable badge.

## API Contract

Base URL: `https://syncsphere-hiv6.onrender.com`

- `GET /assignment/course-data`
- `GET /assignment/country-code`
- No authentication.
- Send simple credential-free GET requests with no body or custom headers.
- Use `cache: "no-store"` so retries reach the live service.
- Treat every non-2xx response as a failure before parsing JSON.
- Run the two initial requests in parallel because neither depends on the other.
- Give each request its own `AbortController` and 15-second timeout.
- Abort on unmount and when a newer request supersedes an older request.
- Do not retry automatically or refresh in the background.

## Runtime Validation

The course response must be an array. A usable course requires:

- Non-empty `courseName`, `courseCode`, `description`, `mainCategory`, `shortCourse`, and `courseType` strings
- Non-negative integer `pricePaise` and `priceUsdCents` values
- Boolean `refundable`

Invalid items are omitted when valid items remain. A non-empty response containing no valid courses is an invalid-data error, not an empty catalog. An actual empty array is a successful empty catalog.

The Pricing Region response must contain `country_code` equal to `IN` or `US`. Any other value is invalid data.

## State Model

Maintain independent Course Catalog and Pricing Region states using an explicit shape equivalent to:

```js
/** @template T */
// { status: "loading" }
// { status: "success", data: T }
// { status: "error", kind: "http" | "network" | "timeout" | "invalid-data" }
```

Search text and selected sort order remain separate UI state. Raw exceptions and HTTP status codes never appear in the interface.

## Loading Behavior

- Render six fixed course skeletons during the initial course request.
- Keep toolbar space visible while courses load, with search and sort disabled.
- Hide decorative skeletons from assistive technology.
- If courses arrive before the Pricing Region, render the cards immediately with `Finding local price...` in the price position.
- Respect `prefers-reduced-motion` by using static skeletons and effectively disabling transitions.

## Failure And Retry Behavior

### Course Catalog Failure

- Show a section-level `Courses couldn't be loaded.` message.
- Provide one `Retry courses` action.
- Retry only the course request.
- Keep any successful Pricing Region state internally.

### Pricing Region Failure

- Keep all successfully loaded courses visible.
- Show `Price unavailable` on every card.
- Show one notice above the grid with one `Retry pricing` action.
- Do not duplicate retry controls across cards.
- Retry only the Pricing Region request.
- Never assume INR or USD as a fallback.

### Simultaneous Failure

- Initially show only the Course Catalog failure because there are no visible prices to recover.
- Preserve the Pricing Region failure internally.
- Reveal the pricing failure and retry action if a later course retry succeeds.

### Retry Concurrency And Focus

- Allow only one active retry per resource.
- Disable the relevant action and show `Retrying...` while it is pending.
- Courses and Pricing Region may retry independently.
- On retry success, move keyboard focus to the result summary.
- On retry failure, retain focus on the re-enabled retry action.

## Empty And Filtered Results

- A successful empty array shows `No courses are available right now.`
- Provide a `Check again` action that reloads only courses.
- A search with no matches shows `No courses match your search.`
- Provide a `Clear search` action.
- Never reuse the failure state for either valid empty condition.

## Pricing

- `IN` uses `pricePaise`, divided by 100 and formatted as INR with the `en-IN` locale.
- `US` uses `priceUsdCents`, divided by 100 and formatted as USD with the `en-US` locale.
- Whole-rupee prices omit `.00`; non-zero paise remain visible.
- USD preserves cents, for example `$39.99`.
- Price sorting compares integer minor-unit values directly; division happens only for display.

## Course Cards

Each card shows:

- Course Category from `mainCategory`
- Course Type from `courseType`, unchanged and labelled `Course Type`
- Course name
- Full description visually clamped to two lines with CSS, not shortened in JavaScript
- Localized price or its loading/unavailable state
- `Refundable` badge only when `refundable` is true

Cards are semantic articles, not links or buttons. The API provides no valid course-detail destination. Use `courseCode` as the stable rendering identity.

## Search

- Search locally over the loaded Course Catalog; never send the query to the API.
- Match `courseName`, `description`, `mainCategory`, `shortCourse`, and `courseType` case-insensitively.
- Exclude `courseCode`, `mangoId`, prices, and refundability from matching.
- Use a controlled `type="search"` input.
- Show an explicit labelled clear action whenever a query exists.
- Support `Escape` to clear the query while retaining input focus.
- No debounce is needed for a maximum of ten courses.

## Sorting

Use a labelled native `select` with:

- `Featured`
- `Price: Low to High`
- `Price: High to Low`

Featured Order preserves the provider's original course order. Equal-price courses also retain that order. Disable price sorting while the Pricing Region is loading or unavailable.

Filter first, then apply the selected stable sort. Clearing search preserves the selected sort. Choosing Featured preserves the current search.

## Results Summary

- Show the live total, such as `8 courses`.
- While filtering, show the relationship, such as `3 of 8 courses`.
- Announce meaningful count changes through a polite live region without moving focus.

## Responsive Behavior

- Component width is fluid (`100%`) with a centered inner maximum of `1200px`.
- Component height is automatic; never clip cards or create an internal scrollbar.
- Grid uses one column below `600px`, two columns from `600px`, and three columns from `900px`.
- Breakpoints respond to component width through container queries.
- Search and sort share a row at `600px` and above.
- Below `600px`, stack full-width search and sort controls.
- Keep loading and disabled toolbar dimensions stable.
- Interactive targets have at least a `44px` hit area.

## Accessibility

- Use a semantic section, heading, toolbar controls, articles, buttons, and status elements.
- Associate persistent labels with search and sort controls.
- Apply `aria-busy` during course loading.
- Use a restrained `aria-live="polite"` region for meaningful state and count changes.
- Keep raw errors out of announcements.
- Preserve visible keyboard focus and full keyboard operability.
- Do not rely on color alone to communicate state.
- Respect reduced-motion preferences.

## Framer Integration

- `CourseCatalog` owns fetching, validation, all four required states, partial pricing failure, search, sorting, retries, result counts, and the responsive grid.
- Hero and footer remain ordinary Framer layers.
- Support flexible/fill width and auto height.
- Spread Framer's supplied `style` prop onto the root element.
- Define safe defaults in code.
- Expose exactly two designer property controls:
  - Brand Colour
  - Typography, constrained to family and variant while code retains sizing and hierarchy
- Property-control changes must not refetch data.

## Footer

- Include a copyright line.
- Use three real links rather than `href="#"` placeholders:
  - Home anchor
  - Courses anchor
  - Contact `mailto:` destination supplied before publishing

## Code Organization

Production files:

- `CourseCatalog.jsx`: plain-JavaScript component state, rendering, interactions, Framer sizing, and property controls
- `courseData.js`: endpoints, requests, validation, filtering, stable sorting, and price formatting

Development-only files contain tests and the mock harness. Do not expose test modes through Framer property controls or publish mocked data.

## Test Harness

Provide deterministic local scenarios for:

- Loading
- Course failure
- Pricing Region failure
- Simultaneous failure
- Empty catalog
- Successful INR pricing
- Successful USD pricing
- Malformed course payload
- Invalid Pricing Region
- Timeout

The published component always uses the real API.

## Verification Gate

Before publishing:

- Unit-test runtime validation, INR/USD formatting, search, and stable sorting.
- Component-test every loading, failure, empty, success, and partial-success state with mocks.
- Complete the full flow using only a keyboard.
- Inspect widths immediately below, at, and above `600px` and `900px`.
- Test current Chrome, Edge, Firefox, desktop Safari, and iOS Safari.
- Test the published Framer page on phone, tablet, and desktop.
- Reload against the live API repeatedly to observe independent failures.
- Confirm there are no unhandled console errors or React warnings.
- Open the published URL in a signed-out private session.
- Confirm the public repository contains the exact code running in Framer.

Any failure above blocks release.

## Repository And Submission

- Use a public GitHub repository rather than a Gist.
- Keep the repository as the source of truth for code copied into Framer.
- Use a short sequence of honest, focused commits.
- Maintain `README.md` with Framer setup, property controls, API behavior, and test commands.
- Maintain `SUBMISSION.md` with placeholders for:
  - Published Framer URL
  - Public repository URL
  - AI disclosure
  - Shared conversation URL
  - Final reflection capped at 200 words
- Configure page title, description, document language, favicon, and social title/description before publishing.
- Verify the published link without an authenticated Framer session.

## Deferred Decisions

The following are intentionally not part of this functional plan:

- Final visual design
- Final color palette
- Detailed hero composition and copy
- Custom social-sharing image

The eventual hero must still satisfy the assignment with a headline, one supporting line, and one button. No generated hero image is planned.

## Implementation Order

1. Create the request, timeout, validation, formatting, filtering, and sorting helpers.
2. Add unit tests for all pure helpers.
3. Implement independent Course Catalog and Pricing Region state flows.
4. Implement loading, failure, empty, partial-success, and working views.
5. Add retry concurrency, cancellation, and focus management.
6. Add search, sorting, result counts, and accessible announcements.
7. Add responsive container behavior and Framer sizing annotations.
8. Add Brand Colour and Typography property controls.
9. Build the deterministic local test harness and component tests.
10. Confirm Framer accepts the `.jsx` code file, integrate the exact repository code, and complete published QA.
11. Finish repository and submission documentation.
