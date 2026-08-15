import { chromium } from "playwright"
import { join } from "node:path"
import { tmpdir } from "node:os"

const baseUrl = process.env.QA_URL || "http://127.0.0.1:4173/"
const browser = await chromium.launch({ headless: true })

const mockCourses = [
  {
    courseName: "Product Strategy",
    courseCode: "PS-101",
    description: "Turn customer insight into clear product decisions and practical roadmaps.",
    mainCategory: "Business",
    shortCourse: "Strategy",
    courseType: "Self-paced",
    pricePaise: 199900,
    priceUsdCents: 3999,
    refundable: true,
  },
  {
    courseName: "Design Systems",
    courseCode: "DS-201",
    description: "Build durable visual foundations that help product teams move consistently.",
    mainCategory: "Design",
    shortCourse: "Systems",
    courseType: "Instructor-led",
    pricePaise: 249900,
    priceUsdCents: 4999,
    refundable: false,
  },
  {
    courseName: "Modern JavaScript",
    courseCode: "JS-301",
    description: "Strengthen the language fundamentals behind reliable modern web interfaces.",
    mainCategory: "Development",
    shortCourse: "JavaScript",
    courseType: "Self-paced",
    pricePaise: 149900,
    priceUsdCents: 2999,
    refundable: true,
  },
]

async function inspectViewport(name, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: "no-preference" })
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  const requestFailures = []

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("pageerror", (error) => pageErrors.push(error.message))
  page.on("requestfailed", (request) => {
    requestFailures.push({ url: request.url(), error: request.failure()?.errorText })
  })

  await page.route("**/assignment/course-data", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockCourses) }),
  )
  await page.route("**/assignment/country-code", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: '{"country_code":"IN"}' }),
  )

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" })
  await page.locator("#hero-title").waitFor()
  await page.locator(".course-card:not(.course-card--skeleton)").first().waitFor()
  await page.waitForTimeout(2600)

  const screenshotPath = join(tmpdir(), `skillpath-${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })

  const result = await page.evaluate(() => ({
    heroText: document.querySelector("#hero-title")?.textContent?.replace(/\s+/g, " ").trim(),
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    courseCards: document.querySelectorAll(".course-card:not(.course-card--skeleton)").length,
    courseFailure: document.querySelector(".catalog-state")?.textContent?.trim() || null,
    pricingUnavailable: [...document.querySelectorAll(".course-price")].filter((node) =>
      node.textContent.includes("Price unavailable"),
    ).length,
    titleBox: document.querySelector("#hero-title")?.getBoundingClientRect().toJSON(),
    supportBox: document.querySelector(".hero-support")?.getBoundingClientRect().toJSON(),
    ctaBox: document.querySelector(".hero-cta")?.getBoundingClientRect().toJSON(),
  }))

  if (name === "mobile") {
    await page.locator(".menu-button").click()
    result.mobileMenuVisible = await page.locator(".mobile-nav").evaluate(
      (node) => getComputedStyle(node).visibility === "visible",
    )
  } else {
    const search = page.locator(".catalog-search input")
    await search.fill("Instructor-led")
    result.filteredCount = await page.locator(".course-card:not(.course-card--skeleton)").count()
    result.filteredSummary = await page.locator(".result-summary").innerText()
    await search.press("Escape")
    result.clearedQuery = await search.inputValue()
    await page.locator(".catalog-sort select").selectOption("price-low")
    result.lowToHighOrder = await page
      .locator(".course-card:not(.course-card--skeleton) h3")
      .allInnerTexts()
  }

  await page.locator(".hero-cta").click()
  await page.waitForTimeout(400)
  result.ctaHash = new URL(page.url()).hash
  result.scrollYAfterCta = await page.evaluate(() => window.scrollY)
  result.consoleErrors = consoleErrors
  result.pageErrors = pageErrors
  result.requestFailures = requestFailures
  result.screenshotPath = screenshotPath

  await context.close()
  return result
}

async function inspectPricingFailure() {
  const context = await browser.newContext({ viewport: { width: 1100, height: 800 } })
  const page = await context.newPage()

  await page.route("**/assignment/course-data", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockCourses) }),
  )
  await page.route("**/assignment/country-code", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: "{}" }),
  )

  await page.goto(baseUrl, { waitUntil: "domcontentloaded" })
  await page.locator(".pricing-notice").waitFor()

  const result = {
    courseCards: await page.locator(".course-card:not(.course-card--skeleton)").count(),
    unavailablePrices: await page.getByText("Price unavailable", { exact: true }).count(),
    pricingRetryActions: await page.getByRole("button", { name: "Retry pricing" }).count(),
  }

  await context.close()
  return result
}

try {
  const desktop = await inspectViewport("desktop", { width: 1440, height: 900 })
  const mobile = await inspectViewport("mobile", { width: 390, height: 844 })
  const pricingFailure = await inspectPricingFailure()
  const results = { desktop, mobile, pricingFailure }

  const failures = []
  for (const [name, result] of Object.entries({ desktop, mobile })) {
    const unexpectedRequestFailures = result.requestFailures.filter(
      (failure) =>
        failure.error !== "net::ERR_ABORTED" ||
        !failure.url.startsWith("https://syncsphere-hiv6.onrender.com/assignment/"),
    )

    if (result.heroText !== "Learn Everything") failures.push(`${name}: incorrect hero text`)
    if (result.scrollWidth > result.viewportWidth) failures.push(`${name}: horizontal overflow`)
    if (result.ctaHash !== "#courses" || result.scrollYAfterCta === 0) {
      failures.push(`${name}: hero CTA did not reach the catalog`)
    }
    if (result.consoleErrors.length || result.pageErrors.length || unexpectedRequestFailures.length) {
      failures.push(`${name}: browser errors detected`)
    }
    if (result.courseCards !== mockCourses.length) failures.push(`${name}: course cards missing`)
  }
  if (!mobile.mobileMenuVisible) failures.push("mobile: menu did not open")
  if (desktop.filteredCount !== 1 || desktop.filteredSummary !== "1 of 3 courses") {
    failures.push("desktop: Course Type search failed")
  }
  if (desktop.clearedQuery !== "") failures.push("desktop: Escape did not clear search")
  if (desktop.lowToHighOrder.join("|") !== "Modern JavaScript|Product Strategy|Design Systems") {
    failures.push("desktop: price sorting failed")
  }
  if (
    pricingFailure.courseCards !== mockCourses.length ||
    pricingFailure.unavailablePrices !== mockCourses.length ||
    pricingFailure.pricingRetryActions !== 1
  ) {
    failures.push("pricing failure: courses or retry behavior is incorrect")
  }

  console.log(JSON.stringify(results, null, 2))
  if (failures.length) throw new Error(failures.join("\n"))
} finally {
  await browser.close()
}
