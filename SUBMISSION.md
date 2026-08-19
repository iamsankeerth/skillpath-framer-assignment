# Skillpath Submission

## Links

- Published Framer URL: https://cheerful-board-868178.framer.app/
- Public repository: https://github.com/iamsankeerth/skillpath-framer-assignment
- Submission document (this file): https://github.com/iamsankeerth/skillpath-framer-assignment/blob/main/SUBMISSION.md
- Conversation website: https://htmlpreview.github.io/?https://github.com/iamsankeerth/skillpath-framer-assignment/blob/main/docs/index.html
- GitHub Pages (turn on Pages → `main` → `/docs` if you want a `github.io` URL): https://iamsankeerth.github.io/skillpath-framer-assignment/
- Shared AI conversation (markdown backup): https://github.com/iamsankeerth/skillpath-framer-assignment/blob/main/AI_CONVERSATION.md

## AI Disclosure

I used **OpenAI Codex** as the main coding agent and **Cursor** to review the Framer page, GitHub history, and this submission. I started Codex with **Matt Pocock’s Grill with Docs** skill so it asked one assignment question at a time and I answered from the brief (live GET APIs, four catalog states, two property controls, no hardcoded data). I accepted the catalog fetch, `pricePaise` / `priceUsdCents` divided by 100, independent course and pricing retries, search/sort, and Brand Colour plus Typography. I changed the hero when mobile layout broke (pinwheel, ribbon, three-row grid), retargeted PR #3 onto `main` instead of the stacked hero branch, and treated canvas property controls—not the published-site pen—as how designers edit the page.

## Reflection

If I had two additional days, I would spend them refining and simplifying the landing page rather than the catalog. The catalog is the core assignment and is functionally complete: it loads live course data, handles API failures, supports search and retry, and converts paise and cents into INR and USD. Visually, however, the surrounding landing page still feels less resolved by comparison.

The two hardest areas were Framer's editing behavior and the hero layout. The Brand Colour and Typography controls appear when SkillpathPage is selected on the canvas, but editing through the website's pen tool did not behave consistently. The hero also required repeated work to position the pinwheel and ribbon and to establish a responsive three-row layout that prevents the CTA from overlapping on mobile.

I am slightly unhappy with how much revision time went into the hero. With two more days, I would simplify it and focus on clearer hierarchy, more reliable responsive behavior, and a more cohesive finish.
