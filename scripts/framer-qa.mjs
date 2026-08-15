import { chromium } from "playwright"
import { spawn } from "node:child_process"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { join } from "node:path"
import { tmpdir } from "node:os"

const port = 4187
const url = `http://127.0.0.1:${port}/framer-preview.html`
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url))
const server = spawn(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", String(port)], { stdio: "ignore" })
const courses = [
  { courseName: "Product Strategy", courseCode: "PS-101", description: "Turn customer insight into clear product decisions.", mainCategory: "Business", shortCourse: "Strategy", courseType: "Self-paced", pricePaise: 199900, priceUsdCents: 3999, refundable: true },
  { courseName: "Design Systems", courseCode: "DS-201", description: "Build durable foundations for product teams.", mainCategory: "Design", shortCourse: "Systems", courseType: "Instructor-led", pricePaise: 249900, priceUsdCents: 4999, refundable: false },
  { courseName: "Modern JavaScript", courseCode: "JS-301", description: "Strengthen modern web fundamentals.", mainCategory: "Development", shortCourse: "JavaScript", courseType: "Self-paced", pricePaise: 149900, priceUsdCents: 2999, refundable: true },
]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(url); if (response.ok) return } catch {}
    await sleep(250)
  }
  throw new Error("Preview server did not start")
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const source = await readFile(new URL("../framer/SkillpathPage.jsx", import.meta.url), "utf8")
  assert(source.includes("@framerSupportedLayoutWidth any-prefer-fixed"), "Missing Framer width annotation")
  assert(source.includes("@framerSupportedLayoutHeight auto"), "Missing Framer height annotation")
  assert(source.includes("@framerIntrinsicWidth 1200"), "Missing intrinsic width annotation")

  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: "no-preference" })
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", error => errors.push(error.message))
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })
    let courseRequests = 0, regionRequests = 0
    await page.route("**/assignment/course-data", route => { courseRequests += 1; route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(courses) }) })
    await page.route("**/assignment/country-code", route => { regionRequests += 1; route.fulfill({ status: 200, contentType: "application/json", body: '{"country_code":"IN"}' }) })
    await page.goto(url)
    await page.locator(".sp-card:not(.sp-skeleton)").first().waitFor()
    const controls = await page.evaluate(() => window.__skillpathControls)
    assert(Object.keys(controls).length === 2, "Framer must expose exactly two controls")
    assert(controls.brandColor.type === "Color", "Brand Colour must use ControlType.Color")
    assert(controls.typography.type === "Font", "Typography must use ControlType.Font")
    assert(await page.locator(".sp-pinwheel path").count() === 4, "Pinwheel must have four blades")
    assert(await page.locator(".sp-ribbon").count() === 1, "Ribbon artwork is missing")
    assert(await page.locator(".sp-card:not(.sp-skeleton)").count() === 3, "Course cards did not render")
    assert(await page.locator(".sp-price").first().innerText() === "₹1,999", "INR formatting is incorrect")
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    assert(!overflow, `${name} has horizontal overflow`)
    if (name === "desktop") {
      await page.evaluate(() => window.__setSkillpathProps({ brandColor: "#ff3366", typography: { fontFamily: "Georgia", fontWeight: 700, fontStyle: "normal" } }))
      await page.waitForTimeout(100)
      const applied = await page.locator(".sp-page").evaluate(node => ({ brand: getComputedStyle(node).getPropertyValue("--sp-brand").trim(), font: getComputedStyle(node).fontFamily }))
      assert(applied.brand === "#ff3366", "Brand Colour control did not update")
      assert(applied.font.includes("Georgia"), "Typography control did not update")
      assert(courseRequests === 1 && regionRequests === 1, "Property changes must not refetch data")
      const search = page.locator('input[type="search"]')
      await search.fill("Instructor-led")
      assert(await page.locator(".sp-card:not(.sp-skeleton)").count() === 1, "Search filter failed")
      await search.press("Escape")
      await page.locator("select").selectOption("price-low")
      assert((await page.locator(".sp-card h3").allInnerTexts())[0] === "Modern JavaScript", "Price sorting failed")
    } else {
      await page.locator(".sp-menu").click()
      assert(await page.locator(".sp-mobile-nav").getAttribute("data-open") === "true", "Mobile navigation did not open")
    }
    const screenshot = join(tmpdir(), `skillpath-framer-${name}.png`)
    await page.screenshot({ path: screenshot, fullPage: true })
    console.log(`${name} screenshot: ${screenshot}`)
    assert(errors.length === 0, `${name} browser errors: ${errors.join(" | ")}`)
    await context.close()
  }

  const reducedContext = await browser.newContext({ viewport: { width: 1100, height: 800 }, reducedMotion: "reduce" })
  const reducedPage = await reducedContext.newPage()
  await reducedPage.route("**/assignment/course-data", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(courses) }))
  await reducedPage.route("**/assignment/country-code", route => route.fulfill({ status: 503, body: "" }))
  await reducedPage.goto(url)
  await reducedPage.locator(".sp-card:not(.sp-skeleton)").first().waitFor()
  assert(await reducedPage.getByText("Price unavailable").count() === 3, "Pricing failure must preserve every course")
  assert(await reducedPage.getByRole("button", { name: "Retry pricing" }).count() === 1, "Pricing failure needs one retry action")
  const before = await reducedPage.locator(".sp-ribbon path").nth(1).getAttribute("d")
  await reducedPage.waitForTimeout(500)
  const after = await reducedPage.locator(".sp-ribbon path").nth(1).getAttribute("d")
  assert(before === after, "Reduced-motion artwork must remain static")
  await reducedContext.close()
  console.log("Framer component QA passed: controls, exact-source render, responsive layouts, catalog behavior, partial pricing failure, and reduced motion.")
} finally {
  await browser?.close()
  server.kill()
}
