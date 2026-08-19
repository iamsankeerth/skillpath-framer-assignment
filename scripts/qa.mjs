import { chromium } from "playwright"
import { join } from "node:path"
import { tmpdir } from "node:os"

const baseUrl = process.env.QA_URL || "http://127.0.0.1:4173/html/skillpath.html"
const browser = await chromium.launch({ headless: true })

const readPinwheelState = () => {
  const windmill = document.querySelector(".windmill")
  const blades = [...document.querySelectorAll(".windmill path")]
  const bounds = windmill.querySelector("g")?.getBBox()

  return {
    transform: getComputedStyle(windmill).transform,
    paths: blades.map((blade) => blade.getAttribute("d")),
    bladeTransforms: blades.map((blade) => blade.getAttribute("transform")),
    sharedCenter: blades.every((blade) => {
      const path = blade.getAttribute("d") || ""
      return path.startsWith("M60 60") && path.includes("60 60 Z")
    }),
    bounds: bounds ? { width: bounds.width, height: bounds.height } : null,
    bladeBounds: blades.map((blade) => {
      const box = blade.getBBox()
      return { width: box.width, height: box.height }
    }),
  }
}

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

async function inspectViewport(name, viewport, colorScheme = "dark") {
  const context = await browser.newContext({ viewport, reducedMotion: "no-preference", colorScheme })
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

  const ribbonBefore = await page.locator(".hero-ribbon__body").getAttribute("d")
  await page.waitForTimeout(350)
  const ribbonAfter = await page.locator(".hero-ribbon__body").getAttribute("d")

  const screenshotPath = join(tmpdir(), `skillpath-${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })

  const approximateFrameRate = await page.evaluate(() =>
    new Promise((resolve) => {
      let frames = 0
      const startedAt = performance.now()

      const sample = (now) => {
        frames += 1
        if (now - startedAt < 900) {
          requestAnimationFrame(sample)
          return
        }

        resolve(Math.round((frames * 1000) / (now - startedAt)))
      }

      requestAnimationFrame(sample)
    }),
  )

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
    ribbonLayers: document.querySelectorAll(".hero-ribbon path").length,
    ribbonBox: document.querySelector(".hero-ribbon")?.getBoundingClientRect().toJSON(),
    windmillBlades: document.querySelectorAll(".windmill path").length,
    windmillBox: document.querySelector(".windmill")?.getBoundingClientRect().toJSON(),
    titleBox: document.querySelector("#hero-title")?.getBoundingClientRect().toJSON(),
    supportBox: document.querySelector(".hero-support")?.getBoundingClientRect().toJSON(),
    ctaBox: document.querySelector(".hero-cta")?.getBoundingClientRect().toJSON(),
  }))
  result.pinwheelRest = await page.evaluate(readPinwheelState)
  result.ribbonAnimated = ribbonBefore !== ribbonAfter
  result.approximateFrameRate = approximateFrameRate

  if (name === "mobile") {
    await page.locator(".menu-button").click()
    await page.locator(".mobile-nav").waitFor({ state: "visible" })
    result.mobileMenuVisible = await page.locator(".mobile-nav").evaluate(
      (node) => getComputedStyle(node).visibility === "visible",
    )
  } else {
    const ribbon = page.locator(".hero-ribbon")
    const neutralTransform = await ribbon.evaluate((node) => getComputedStyle(node).transform)
    const pinwheelNeutral = await page.evaluate(readPinwheelState)
    const heroBox = await page.locator(".hero").boundingBox()
    await page.mouse.move(heroBox.x + heroBox.width * 0.88, heroBox.y + heroBox.height * 0.22)
    await page.waitForTimeout(110)
    const activeTransform = await ribbon.evaluate((node) => getComputedStyle(node).transform)
    const pinwheelActive = await page.evaluate(readPinwheelState)
    await page.waitForTimeout(1800)
    const settledTransform = await ribbon.evaluate((node) => getComputedStyle(node).transform)
    const pinwheelSettled = await page.evaluate(readPinwheelState)
    await page.waitForTimeout(400)
    const pinwheelIdle = await page.evaluate(readPinwheelState)
    result.pointerResponded = neutralTransform !== activeTransform
    result.pointerSettled = activeTransform !== settledTransform
    result.pinwheelMorphResponded = pinwheelNeutral.paths.some(
      (path, index) => path !== pinwheelActive.paths[index],
    )
    result.pinwheelTransformResponded = pinwheelNeutral.transform !== pinwheelActive.transform
    result.pinwheelReturned = pinwheelNeutral.paths.every(
      (path, index) => path === pinwheelSettled.paths[index],
    ) && pinwheelNeutral.transform === pinwheelSettled.transform
    result.pinwheelIdleStatic = pinwheelSettled.paths.every(
      (path, index) => path === pinwheelIdle.paths[index],
    ) && pinwheelSettled.transform === pinwheelIdle.transform

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

async function inspectMotionPreferences() {
  const inspect = async (reducedMotion, colorScheme) => {
    const context = await browser.newContext({
      viewport: { width: 1100, height: 800 },
      reducedMotion,
      colorScheme,
    })
    const page = await context.newPage()

    await page.route("**/assignment/course-data", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockCourses) }),
    )
    await page.route("**/assignment/country-code", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: '{"country_code":"IN"}' }),
    )

    await page.goto(baseUrl, { waitUntil: "domcontentloaded" })
    await page.locator(".hero-ribbon__body").waitFor()
    const before = await page.locator(".hero-ribbon__body").getAttribute("d")
    const windmillBefore = await page.evaluate(readPinwheelState)
    await page.waitForTimeout(700)
    const after = await page.locator(".hero-ribbon__body").getAttribute("d")
    const windmillAfter = await page.evaluate(readPinwheelState)
    const heroBox = await page.locator(".hero").boundingBox()
    await page.mouse.move(heroBox.x + heroBox.width * 0.82, heroBox.y + heroBox.height * 0.24)
    await page.waitForTimeout(110)
    const windmillPointer = await page.evaluate(readPinwheelState)
    const screenshotPath = join(tmpdir(), `skillpath-${reducedMotion}-${colorScheme}.png`)
    await page.screenshot({ path: screenshotPath })

    const result = await page.evaluate(() => ({
      scheme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      canvas: getComputedStyle(document.body).backgroundColor,
      ribbonVisible: document.querySelector(".hero-ribbon")?.getBoundingClientRect().width > 0,
    }))
    result.ribbonAnimated = before !== after
    result.windmillIdleAnimated = windmillBefore.paths.some(
      (path, index) => path !== windmillAfter.paths[index],
    ) || windmillBefore.transform !== windmillAfter.transform
    result.windmillPointerAnimated = windmillAfter.paths.some(
      (path, index) => path !== windmillPointer.paths[index],
    ) || windmillAfter.transform !== windmillPointer.transform
    result.screenshotPath = screenshotPath

    await context.close()
    return result
  }

  return {
    reduced: await inspect("reduce", "dark"),
    lightScheme: await inspect("no-preference", "light"),
  }
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
  const motionPreferences = await inspectMotionPreferences()
  const results = { desktop, mobile, pricingFailure, motionPreferences }

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
    if (result.ribbonLayers !== 7) failures.push(`${name}: sculpture layers missing`)
    if (!result.ribbonAnimated) failures.push(`${name}: ribbon animation did not advance`)
    if (result.windmillBlades !== 4) failures.push(`${name}: windmill blades are missing`)
    if (!result.pinwheelRest.sharedCenter) failures.push(`${name}: windmill blades do not share one center`)
    if (
      !result.pinwheelRest.bounds ||
      Math.abs(result.pinwheelRest.bounds.width / result.pinwheelRest.bounds.height - 1) > 0.05
    ) {
      failures.push(`${name}: windmill footprint is not square`)
    }
    if (result.pinwheelRest.bladeBounds.some(
      (box) => Math.min(box.width, box.height) < 45 || Math.max(box.width, box.height) < 55,
    )) {
      failures.push(`${name}: windmill blades are too narrow`)
    }
    if (result.approximateFrameRate < 45) failures.push(`${name}: animation frame rate was too low`)
  }
  if (!desktop.pointerResponded || !desktop.pointerSettled) {
    failures.push("desktop: sculpture pointer inertia failed")
  }
  if (
    !desktop.pinwheelMorphResponded ||
    !desktop.pinwheelTransformResponded ||
    !desktop.pinwheelReturned ||
    !desktop.pinwheelIdleStatic
  ) {
    failures.push("desktop: pinwheel morph, inertia, return, or idle state failed")
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
  if (motionPreferences.reduced.ribbonAnimated) {
    failures.push("reduced motion: sculpture continued morphing")
  }
  if (motionPreferences.reduced.windmillIdleAnimated || motionPreferences.reduced.windmillPointerAnimated) {
    failures.push("reduced motion: pinwheel continued moving")
  }
  if (
    motionPreferences.lightScheme.scheme !== "light" ||
    !motionPreferences.lightScheme.ribbonVisible ||
    !motionPreferences.lightScheme.ribbonAnimated ||
    motionPreferences.lightScheme.windmillIdleAnimated ||
    !motionPreferences.lightScheme.windmillPointerAnimated
  ) {
    failures.push("light scheme: sculpture did not render or animate")
  }

  console.log(JSON.stringify(results, null, 2))
  if (failures.length) throw new Error(failures.join("\n"))
} finally {
  await browser.close()
}
