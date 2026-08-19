import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      framer: fileURLToPath(new URL("./src/framerShim.js", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        conversation: fileURLToPath(new URL("./index.html", import.meta.url)),
        conversationArchive: fileURLToPath(new URL("./html/conversation.html", import.meta.url)),
        framer: fileURLToPath(new URL("./html/framer-preview.html", import.meta.url)),
        skillpath: fileURLToPath(new URL("./html/skillpath.html", import.meta.url)),
      },
    },
  },
})
