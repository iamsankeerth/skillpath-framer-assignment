import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { parseConversation } from "./parseConversation"

describe("conversation parser", () => {
  it("keeps heading-like content inside fenced code blocks", () => {
    const result = parseConversation(`# Export\n\n## 👤 User\n\nBefore\n\n\`\`\`md\n### 🔧 Tool Call\n\`\`\`\n\nAfter\n\n## 🤖 Codex\n\nDone`)

    expect(result.preamble).toBe("# Export")
    expect(result.sections).toHaveLength(2)
    expect(result.sections[0].body).toContain("### 🔧 Tool Call")
    expect(result.sections.map(({ type }) => type)).toEqual(["user", "assistant"])
  })

  it("parses every entry in the published transcript", () => {
    const path = fileURLToPath(new URL("../../docs/AI_CONVERSATION.md", import.meta.url))
    const result = parseConversation(readFileSync(path, "utf8"))
    const count = (type) => result.sections.filter((section) => section.type === type).length

    expect(result.preamble).toContain("Codex Session Export")
    expect(count("user")).toBe(133)
    expect(count("assistant")).toBe(348)
    expect(count("tool-call")).toBe(110)
    expect(count("tool-output")).toBe(110)
  })
})
