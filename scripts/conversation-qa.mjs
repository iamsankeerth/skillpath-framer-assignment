import { chromium } from "playwright"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import { join } from "node:path"
import { tmpdir } from "node:os"

const port = 4188
const url = `http://127.0.0.1:${port}/html/conversation.html`
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url))
const server = spawn(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", String(port)], { stdio: "ignore" })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const assert = (condition, message) => { if (!condition) throw new Error(message) }

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { const response = await fetch(url); if (response.ok) return } catch {}
    await sleep(250)
  }
  throw new Error("Conversation preview server did not start")
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })

  for (const [name, viewport, colorScheme] of [
    ["desktop-light", { width: 1440, height: 900 }, "light"],
    ["desktop-dark", { width: 1440, height: 900 }, "dark"],
    ["mobile-light", { width: 390, height: 844 }, "light"],
  ]) {
    const context = await browser.newContext({ viewport, colorScheme })
    const page = await context.newPage()
    const errors = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()) })
    await page.goto(url, { waitUntil: "networkidle" })

    assert(await page.locator(".conversation-entry").count() === 701, `${name}: transcript entry count is incorrect`)
    assert(await page.locator('[data-entry-type="tool-call"]').count() === 110, `${name}: tool call count is incorrect`)
    assert(await page.locator('[data-entry-type="tool-output"]').count() === 110, `${name}: tool output count is incorrect`)
    assert(await page.locator("details").count() === 0, `${name}: tool records must not be collapsed`)

    const layout = await page.evaluate(() => ({
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
      hiddenTools: [...document.querySelectorAll('[data-entry-type^="tool-"]')].some((node) => {
        const style = getComputedStyle(node)
        return style.display === "none" || style.visibility === "hidden"
      }),
      feed: document.querySelector(".conversation-feed").getBoundingClientRect().toJSON(),
      user: document.querySelector('[data-entry-type="user"]').getBoundingClientRect().toJSON(),
      assistant: document.querySelector('[data-entry-type="assistant"]').getBoundingClientRect().toJSON(),
      feedBorder: getComputedStyle(document.querySelector(".conversation-feed")).borderTopWidth,
      entryBorder: getComputedStyle(document.querySelector(".conversation-entry")).borderBottomWidth,
      userMetaVisible: getComputedStyle(document.querySelector('[data-entry-type="user"] .entry-meta')).display !== "none",
      assistantMetaVisible: getComputedStyle(document.querySelector('[data-entry-type="assistant"] .entry-meta')).display !== "none",
    }))
    assert(!layout.pageOverflow, `${name}: page has horizontal overflow`)
    assert(!layout.hiddenTools, `${name}: one or more tool records are hidden`)
    assert(Math.abs(layout.user.right - layout.feed.right) <= 1, `${name}: user entries are not right aligned`)
    assert(Math.abs(layout.assistant.left - layout.feed.left) <= 1, `${name}: Codex entries are not left aligned`)
    assert(layout.assistant.left < layout.user.left, `${name}: conversation lanes are not visually distinct`)
    assert(layout.feedBorder === "0px" && layout.entryBorder === "0px", `${name}: conversation divider lines are still visible`)
    assert(!layout.userMetaVisible && !layout.assistantMetaVisible, `${name}: chat role metadata is still visible`)
    assert(errors.length === 0, `${name}: browser errors: ${errors.join(" | ")}`)

    const screenshot = join(tmpdir(), `skillpath-conversation-${name}.png`)
    await page.screenshot({ path: screenshot, fullPage: false })
    console.log(`${name} screenshot: ${screenshot}`)
    await context.close()
  }

  console.log("Conversation QA passed: complete transcript, expanded tool records, responsive layout, and light/dark rendering.")
} finally {
  await browser?.close()
  server.kill()
}
