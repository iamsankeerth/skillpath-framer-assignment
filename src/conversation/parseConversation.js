const sectionPatterns = [
  { type: "user", label: "User", pattern: /^##\s+.*\bUser\s*$/u },
  { type: "assistant", label: "Codex", pattern: /^##\s+.*\bCodex\s*$/u },
  { type: "tool-call", label: "Tool call", pattern: /^###\s+.*\bTool Call\s*$/u },
  { type: "tool-output", label: "Tool output", pattern: /^###\s+.*\bTool Output\s*$/u },
]

function sectionFor(line) {
  return sectionPatterns.find(({ pattern }) => pattern.test(line))
}

function fenceMarker(line) {
  const match = line.match(/^\s*(`{3,}|~{3,})/)
  return match?.[1] ?? null
}

export function parseConversation(markdown) {
  const lines = markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n")
  const sections = []
  const preamble = []
  let active = null
  let fence = null

  const finishSection = () => {
    if (!active) return
    sections.push({
      ...active,
      body: active.lines.join("\n").trim(),
    })
  }

  for (const line of lines) {
    const marker = fenceMarker(line)
    if (marker) {
      if (!fence) fence = marker[0]
      else if (marker[0] === fence && marker.length >= 3) fence = null
    }

    const nextSection = fence ? null : sectionFor(line)
    if (nextSection) {
      finishSection()
      active = {
        id: `${nextSection.type}-${sections.length + 1}`,
        type: nextSection.type,
        label: nextSection.label,
        lines: [],
      }
      continue
    }

    if (active) active.lines.push(line)
    else preamble.push(line)
  }

  finishSection()

  return {
    preamble: preamble.join("\n").trim(),
    sections,
  }
}
