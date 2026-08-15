import React, { useState } from "react"
import ReactDOM from "react-dom/client"
import SkillpathPage from "../framer/SkillpathPage.jsx"

function Preview() {
  const [props, setProps] = useState({
    brandColor: "#0ae448",
    typography: { fontFamily: "DM Sans", fontWeight: 400, fontStyle: "normal" },
  })

  window.__setSkillpathProps = (nextProps) => setProps((current) => ({ ...current, ...nextProps }))
  window.__skillpathControls = SkillpathPage.__framerPropertyControls

  return <SkillpathPage {...props} style={{ width: "100%" }} />
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Preview />
  </React.StrictMode>,
)
