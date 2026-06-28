<div align="center">

<img src="public/pica-logo.svg" width="140" alt="Magpie logo — a magpie holding a document" />

# Magpie

**A Personalized Information-seeking Conversational Agent (PICA) that brings back the web's brightest passages.**

*it fetches what shines.*

</div>

---

**Magpie** is a conversational search studio over web-scale corpora (ClueWeb22-B). You log in, **pick
research retrievers and rerankers on the fly**, and hold a multi-turn, *personalized* conversation —
the server loads/evicts the matching indexes on demand, fuses multiple retrievers, and answers with
**inline-cited passages**. Each turn shows the cited response, the top-k passages, **each retriever's
own ranking side-by-side** with the documents they agree on highlighted, the reformulated query, and
your editable user profile (PTKB).

> **The name.** The engine/package is **`pica`** = **P**ersonalized **I**nformation-seeking
> **C**onversational **A**gent. The magpie — *Pica pica* — is famous for collecting shiny, valuable
> things; here it collects the most relevant passages. It's a wink at the IR tradition of naming
> toolkits after birds: Waterloo's [Anserini](https://github.com/castorini/anserini)/`pyserini` is
> the *goose* (anser); Magpie is ours.

## Architecture

```
  Magpie (this repo, pica)            Magpie backend (apcir.interactive)
  React + Vite + TS + Tailbind  ──HTTP/JSON──►  FastAPI search server
  (login · activate · search ·                  · dynamic-residency engine (load/evict any
   per-retriever panels · PTKB)                    retriever/reranker/LLM, capacity-guarded)
                                                  · SQLite auth + sessions + per-user PTKB
                                                  · enrichment: per-retriever lists, shared-doc
                                                    overlap, reformulated query, [n] citations
```

The frontend never imports the Python backend — they talk over **HTTP/JSON**. The backend engine
lives in the `apcir` package (pip-installed); a small launcher here (`server/run_magpie.py`) imports
it to start the server, and in production serves this built SPA from the same process (one URL).

## API the UI uses

`POST /auth/login` · `GET /auth/me` · `POST /auth/logout` · `GET /models` · `POST /activate` +
`GET /activate/status/{id}` · `POST /search` · `GET/POST /sessions` + `PATCH/DELETE /sessions/{id}` +
`GET /sessions/{id}/turns` · `GET/POST /ptkb` + `PUT/DELETE /ptkb/{id}`.

## Quickstart (dev)

```bash
# 1) start the backend (needs the apcir package + indexes; see the backend's docs/DEPLOY.md)
python server/run_magpie.py            # serves http://localhost:8500

# 2) start the frontend (proxies /search, /models, ... → localhost:8500)
npm install
npm run dev                            # http://localhost:5173
```

Reach a remote backend (octal40/octal31, no public IP) via the SSH/Cloudflare tunnel described in the
backend's `docs/DEPLOY.md`, then point the dev proxy (or the deployed app) at it.

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · shadcn/ui · [assistant-ui](https://github.com/assistant-ui/assistant-ui)
(the chat-thread primitives) — custom panels for the per-retriever comparison, citation jump, and PTKB.
Visual language is a homage to the Anthropic warm-minimal aesthetic.

## License

MIT — see [LICENSE](LICENSE).
