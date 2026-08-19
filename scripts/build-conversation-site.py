#!/usr/bin/env python3
"""Turn AI_CONVERSATION.md into a readable chat page."""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "AI_CONVERSATION.md"
OUT = ROOT / "docs" / "index.html"

HEADING = re.compile(r"^## (👤 User|🤖 Codex)\s*$", re.M)
TOOL = re.compile(r"^### 🔧 Tool Call\s*$", re.M)


def parse(md: str) -> tuple[str, list[dict]]:
    meta_end = md.find("\n---\n")
    meta = md[:meta_end].strip() if meta_end != -1 else ""
    body = md[meta_end + 5 :] if meta_end != -1 else md
    parts = HEADING.split(body)
    messages = []
    i = 1
    while i < len(parts):
        role = "user" if "User" in parts[i] else "assistant"
        content = parts[i + 1].strip()
        tools = []
        chunks = TOOL.split(content)
        text = chunks[0].strip()
        for chunk in chunks[1:]:
            tools.append(chunk.strip())
        messages.append({"role": role, "text": text, "tools": tools})
        i += 2
    return meta, messages


def bubble_html(message: dict) -> str:
    label = "You" if message["role"] == "user" else "Codex"
    role = message["role"]
    body = html.escape(message["text"])
    tools = ""
    if message["tools"]:
        items = []
        for index, tool in enumerate(message["tools"], 1):
            preview = html.escape(tool[:4000] + ("…" if len(tool) > 4000 else ""))
            items.append(
                f'<details class="tool"><summary>Tool call {index}</summary>'
                f"<pre>{preview}</pre></details>"
            )
        tools = "".join(items)
    return f'<article class="msg {role}"><div class="who">{label}</div><pre class="text">{body}</pre>{tools}</article>'


def main() -> None:
    meta, messages = parse(SOURCE.read_text(encoding="utf-8"))
    payload = json.dumps(
        {
            "title": "Skillpath — Codex conversation",
            "count": len(messages),
            "users": sum(1 for m in messages if m["role"] == "user"),
            "assistants": sum(1 for m in messages if m["role"] == "assistant"),
        }
    )
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Skillpath Codex conversation</title>
  <style>
    :root {{
      --bg: #101210;
      --panel: #1a1d1b;
      --you: #1f3d2a;
      --bot: #232623;
      --text: #f3efe2;
      --muted: #9aa39a;
      --line: #333833;
      --brand: #0ae448;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
    }}
    header {{
      padding: 28px 20px 16px;
      border-bottom: 1px solid var(--line);
      background: #0c0e0c;
      position: sticky;
      top: 0;
    }}
    header h1 {{ margin: 0 0 8px; font-size: 22px; }}
    header p {{ margin: 0; color: var(--muted); font-size: 14px; line-height: 1.45; max-width: 720px; }}
    main {{ max-width: 880px; margin: 0 auto; padding: 24px 16px 64px; display: grid; gap: 14px; }}
    .msg {{
      border-radius: 14px;
      padding: 14px 16px;
      border: 1px solid var(--line);
    }}
    .msg.user {{ background: var(--you); margin-right: 8%; }}
    .msg.assistant {{ background: var(--bot); margin-left: 8%; }}
    .who {{
      font-size: 12px;
      letter-spacing: .04em;
      text-transform: uppercase;
      color: var(--brand);
      font-weight: 700;
      margin-bottom: 8px;
    }}
    .msg.user .who {{ color: #b7ffcf; }}
    pre.text, .tool pre {{
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      margin: 0;
      font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }}
    .tool {{ margin-top: 10px; color: var(--muted); font-size: 13px; }}
    .tool summary {{ cursor: pointer; }}
    .meta {{
      color: var(--muted);
      font-size: 13px;
      white-space: pre-wrap;
      margin-top: 12px;
    }}
  </style>
</head>
<body>
  <header>
    <h1>Skillpath assignment conversation</h1>
    <p>OpenAI Codex session used to plan and build the Framer Skillpath page.
    Started with Matt Pocock’s Grill with Docs skill so Codex asked assignment questions one at a time.
    Tool output is folded. This page is the readable transcript for reviewers.</p>
    <p class="meta">{html.escape(meta)}</p>
  </header>
  <main>
    {"".join(bubble_html(m) for m in messages)}
  </main>
  <script type="application/json" id="stats">{payload}</script>
</body>
</html>
"""
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(page, encoding="utf-8")
    print(f"wrote {OUT} messages={len(messages)} bytes={OUT.stat().st_size}")


if __name__ == "__main__":
    main()
