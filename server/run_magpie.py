"""Launch the Magpie backend (the apcir search server) + (in prod) serve this built frontend.

`apcir` is pip-installed in the environment, so this tiny launcher can `import` it from anywhere —
this is the whole frontend<->backend boundary: the React app (this repo) never imports Python; it
just calls the HTTP API this server exposes. Run from the pica repo root:

    python server/run_magpie.py            # -> http://localhost:8500

Env: MAGPIE_DB (sqlite path), MAGPIE_PORT (default 8500), MAGPIE_ADMIN_PW (seed the admin account).
Reach a remote backend host (octal40/octal31, no public IP) via the SSH/Cloudflare tunnel in the
backend's docs/DEPLOY.md.
"""
import os

import uvicorn
from apcir.interactive.pipeline import PipelineConfig
from apcir.interactive.search_server import create_app
from apcir.interactive.store import Store

DB_PATH = os.environ.get("MAGPIE_DB", "/data/rech/huiyuche/magpie.db")
PORT = int(os.environ.get("MAGPIE_PORT", "8500"))
ADMIN_PW = os.environ.get("MAGPIE_ADMIN_PW", "change-me")

store = Store(DB_PATH)
# accounts are admin-created (no open signup); seed one admin on first run:
if store.verify_user("admin", ADMIN_PW) is None:
    try:
        store.create_user("admin", ADMIN_PW, is_admin=True)
        print(f"[magpie] seeded admin / {ADMIN_PW!r}  (set MAGPIE_ADMIN_PW to change)")
    except ValueError:
        pass  # 'admin' already exists with a different password

# eager_load=False -> start EMPTY; load indexes on demand via POST /activate (the Magpie model).
app = create_app(PipelineConfig(), eager_load=False, store=store)

# Serve the built SPA from the same process if `npm run build` has produced ./dist (one URL, no
# CORS). Mounted AFTER the API routes, so /search, /models, ... still hit the API; everything else
# falls through to the SPA (html=True -> index.html for client-side routes).
DIST = os.path.join(os.path.dirname(__file__), "..", "dist")
if os.path.isdir(DIST):
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=DIST, html=True), name="spa")
    print(f"[magpie] serving built frontend from {DIST}")

if __name__ == "__main__":
    # ONE worker: huge resident indexes + GPU search are not multi-worker safe.
    uvicorn.run(app, host="127.0.0.1", port=PORT, workers=1)
