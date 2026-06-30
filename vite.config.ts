import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev: proxy the Magpie backend's API routes to the running server (localhost:8500, reached via the
// SSH/Cloudflare tunnel from the backend's docs/DEPLOY.md). The frontend always calls these paths at
// the root, so DEV (proxied) and PROD (M5: the backend serves the static SPA) behave identically —
// no /api prefix, no rewrite, no env juggling.
const BACKEND = 'http://localhost:8500'
const API_PREFIXES = ['/search', '/models', '/activate', '/auth', '/sessions', '/ptkb', '/health', '/doc']

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      API_PREFIXES.map((p) => [p, { target: BACKEND, changeOrigin: true }]),
    ),
  },
})
