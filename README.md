<div align="center">

<img src="public/rali_pica.png" width="200" alt="Magpie logo — a magpie holding a document" />

# Magpie

**A Personalized Information-seeking Conversational Agent (PICA) that brings back the web's brightest passages.**

*it fetches what shines.*

</div>

---

**Magpie** is a conversational search studio over web-scale corpora (ClueWeb22-B, QReCC, TopiOCQA).
You log in, **pick corpora, retrievers, query encoders and rerankers on the fly**, and hold a
multi-turn, *personalized* conversation — the server loads/evicts the matching indexes on demand,
fuses multiple retrievers, and answers with **inline-cited passages** (gpt-5-mini RAG). Each turn
shows the cited response, a **comparison grid** of every retriever's ranking side-by-side, the
reformulated query, and your editable, auto-learning user profile (PTKB).

> **The name.** The engine/package is **`pica`** = **P**ersonalized **I**nformation-seeking
> **C**onversational **A**gent. The magpie — *Pica pica* — is famous for collecting shiny, valuable
> things; here it collects the most relevant passages. It's a wink at the IR tradition of naming
> toolkits after birds: Waterloo's [Anserini](https://github.com/castorini/anserini)/`pyserini` is
> the *goose* (anser); Magpie is ours.

## What a turn looks like

- **Cited answer** — gpt-5-mini RAG (`reasoning_effort=minimal`, ~1.5 s) with inline `[n]` markers;
  clicking a marker jumps to (and flashes) the cited passage. Falls back to extractive if the LLM errors.
- **Comparison grid** (foldable, right of the answer bubble) — one **canonical** column (the fused /
  reranked top-10, warm gradient: rank 1 deepest) plus one column per retriever leg. A cell that is
  **shared** with the canonical top-10 reuses the canonical shade + number; a doc **unique** to a
  retriever takes that retriever's own hue and its own rank. **Cited passages get a dark same-hue
  border + bold.** Click any cell to read the passage text (`GET /doc?docid=`).
- **`🪶 learned: "…"`** — the profile facts auto-extracted this turn (persists across session reload).
- **User profile** — a floating, **draggable & resizable** card: view/add/edit/delete facts,
  toggle auto-learn.
- **Select corpora & models** — units grouped by corpus (one corpus active at a time), formal model
  names, per-retriever query-formulation dropdowns, htop-style **RAM + per-GPU VRAM gauges**, and a
  live progress bar while an index loads (per-block).

## Architecture

```
  Magpie (this repo, pica)            Magpie backend (apcir.interactive)
  React + Vite + TS + Tailwind  ──HTTP/JSON──►  FastAPI search server
  (login · activate · search ·                  · dynamic-residency engine (load/evict any
   comparison grid · PTKB)                        retriever/reranker/LLM, capacity-guarded)
                                                 · SQLite auth + sessions + per-user PTKB
                                                 · enrichment: per-retriever lists, shared-doc
                                                   overlap, reformulated query, [n] citations
```

The frontend never imports the Python backend — they talk over **HTTP/JSON**. The backend engine
lives in the `apcir` package (pip-installed, see its
[module README](https://github.com/YuchenHui22314/TREC_iKAT_2024/tree/yuchen/src/apcir/interactive));
a small launcher here (`server/run_magpie.py`) imports it to start the server, and in production
serves this built SPA from the same process (one URL).

## Corpora & what they cost to serve

Doc embeddings are stored fp32 on disk and loaded **fp16** into CPU RAM (halves memory, matches the
GPU search path). Load peak ≈ resident + one fp32 block being cast.

| Corpus | Doc encoder | #docs | dim | blocks | fp32 on disk | fp16 resident RAM | load peak |
|---|---|---:|---:|---:|---:|---:|---:|
| ClueWeb22-B | ANCE | ~117 M | 768 | 12 | 336 GB | 168 GB | 210 GB |
| ClueWeb22-B | Qwen3-Embedding-0.6B | ~117 M | 1024 | 6 | 450 GB | 235 GB | 320 GB |
| ClueWeb22-B | SPLADE-v3 (inverted) | ~117 M | — | — | — | 235 GB | 250 GB |
| ClueWeb22-B | BM25 (Lucene, on disk) | ~117 M | — | — | — | 5 GB | 5 GB |
| QReCC | ANCE | ~56 M | 768 | 55 | 161 GB | 80 GB | 85 GB |
| QReCC | Qwen3-Embedding-0.6B | ~56 M | 1024 | 55 | 214 GB | 107 GB | 112 GB |
| TopiOCQA | ANCE | ~26 M | 768 | 26 | 74 GB | 37 GB | 42 GB |

(The ClueWeb-Qwen 320 GB load peak comes from its 6 coarse ~80 GB blocks; the search itself streams
fp16 through the GPUs. Query encoders are small — ~1–2 GB VRAM each.)

## Code map (start here)

| File | Owns |
|---|---|
| `src/App.tsx` | top-level state (session, messages, model status, panel toggles) + layout |
| `src/components/ModelPanel.tsx` | "Select corpora & models": corpus groups, gauges, activation flow |
| `src/components/MessageTurn.tsx` | one assistant turn: avatar bubble + citations + PTKB line |
| `src/components/ComparisonGrid.tsx` + `src/lib/grid.ts` | the comparison grid (grid.ts = pure, tested cell mapping) |
| `src/components/FloatingProfile.tsx` + `PtkbPanel.tsx` | draggable/resizable profile card + PTKB CRUD |
| `src/components/PassageModal.tsx` | passage-text viewer (`/doc`) |
| `src/components/SessionSidebar.tsx`, `Login.tsx`, `Composer.tsx` | sessions CRUD/reload · auth · input |
| `src/lib/api.ts`, `types.ts` | HTTP client (Bearer token) · shared response types |
| `src/lib/retrievers.ts`, `activeSet.ts` | build `/search` legs from resident models · activation-set rules |
| `src/lib/citations.ts`, `sessions.ts`, `labels.ts` | `[n]` splitting · turn reconstruction on reload · display names |

Assets: `public/rali_pica.png` (logo, login), `public/rali_pica_head.png` (avatar head crop),
`public/pica.png` (conversation background — magpie on a branch growing from the sidebar).

## API the UI uses

`POST /auth/login` · `GET /auth/me` · `POST /auth/logout` · `GET /models` · `POST /activate` +
`GET /activate/status/{id}` · `POST /search` · `GET /doc?docid=` · `GET/POST /sessions` +
`PATCH/DELETE /sessions/{id}` + `GET /sessions/{id}/turns` · `GET/POST /ptkb` + `PUT/DELETE /ptkb/{id}`.

## Quickstart (dev)

```bash
# 1) start the backend (needs the apcir package + indexes; see the backend's docs/DEPLOY.md)
python server/run_magpie.py            # serves http://localhost:8500

# 2) start the frontend (proxies /search, /models, ... → localhost:8500)
npm install
npm run dev                            # http://localhost:5173

# tests (pure logic: citations, grid, retrievers, activeSet, sessions)
npx vitest run
```

Reach a remote backend (octal40/octal31, no public IP) via the SSH/Cloudflare tunnel described in the
backend's `docs/DEPLOY.md`, then point the dev proxy (or the deployed app) at it.

## Deploy (one service)

Build the SPA and let the Magpie backend serve it from the **same process** — one URL, no CORS:

```bash
npm run build                          # -> ./dist
python server/run_magpie.py            # serves the SPA + API at http://localhost:8500
```

`run_magpie.py` mounts `./dist` via FastAPI `StaticFiles` **after** the API routes, so `/search`,
`/models`, … hit the API and every other path serves the SPA. Expose it through the tunnel in the
backend's `docs/DEPLOY.md`. (Verified: with `dist/` present, `GET /` returns the app and `GET /health`
/ `GET /models` return JSON on the same port.)

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · Vitest. The conversation thread, comparison grid,
citation jump, and PTKB panels are **custom** components: [assistant-ui](https://github.com/assistant-ui/assistant-ui)
was evaluated, but Magpie's per-turn layout (a cited answer + a fused-vs-per-retriever grid with
overlap coloring) is bespoke enough that a thin custom thread on Tailwind fit better than its
runtime. The citation model (inline `[n]` + click-to-source) follows Onyx/Perplexica; the visual
language is a homage to the Anthropic warm-minimal aesthetic.

## License

MIT — see [LICENSE](LICENSE).
