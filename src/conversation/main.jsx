import React from "react"
import ReactDOM from "react-dom/client"
import { ConversationPage } from "./ConversationPage"
import "./conversation.css"

ReactDOM.createRoot(document.getElementById("conversation-root")).render(
  <React.StrictMode>
    <ConversationPage />
  </React.StrictMode>,
)
