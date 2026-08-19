import { useMemo } from "react"
import { ArrowLeft } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import transcript from "../../docs/AI_CONVERSATION.md?raw"
import { parseConversation } from "./parseConversation"

const markdownPlugins = [remarkGfm]

function Markdown({ children }) {
  return <ReactMarkdown remarkPlugins={markdownPlugins}>{children}</ReactMarkdown>
}

export function ConversationPage() {
  const conversation = useMemo(() => parseConversation(transcript), [])
  const counts = useMemo(
    () => conversation.sections.reduce((total, section) => {
      total[section.type] = (total[section.type] ?? 0) + 1
      return total
    }, {}),
    [conversation],
  )

  return (
    <div className="conversation-page">
      <header className="conversation-header">
        <div className="conversation-header-inner">
          <a className="back-link" href="/" aria-label="Back to Skillpath">
            <ArrowLeft aria-hidden="true" size={18} strokeWidth={2} />
            <span>Skillpath</span>
          </a>
          <span className="header-label">Build conversation</span>
        </div>
      </header>

      <main>
        <section className="conversation-intro" aria-labelledby="conversation-title">
          <p className="eyebrow">AI conversation record</p>
          <h1 id="conversation-title">How Skillpath was built</h1>
          <p className="intro-copy">
            The complete chronological discussion, decisions, tool calls, and outputs behind the assignment.
          </p>
          <dl className="conversation-summary" aria-label="Conversation summary">
            <div><dt>User messages</dt><dd>{counts.user ?? 0}</dd></div>
            <div><dt>Codex messages</dt><dd>{counts.assistant ?? 0}</dd></div>
            <div><dt>Tool calls</dt><dd>{counts["tool-call"] ?? 0}</dd></div>
            <div><dt>Tool outputs</dt><dd>{counts["tool-output"] ?? 0}</dd></div>
          </dl>
        </section>

        <section className="session-metadata" aria-label="Session metadata">
          <Markdown>{conversation.preamble}</Markdown>
        </section>

        <section className="conversation-feed" aria-label="Full conversation">
          {conversation.sections.map((section, index) => (
            <article
              className="conversation-entry"
              data-entry-type={section.type}
              id={section.id}
              key={section.id}
            >
              <div className="entry-meta">
                <span className="entry-index">{String(index + 1).padStart(3, "0")}</span>
                <span className="entry-role">{section.label}</span>
              </div>
              <div className="entry-content">
                <Markdown>{section.body}</Markdown>
              </div>
            </article>
          ))}
        </section>
      </main>

      <footer className="conversation-footer">
        <p>End of exported conversation</p>
      </footer>
    </div>
  )
}
