// TypeScript mirror of the Magpie backend schemas (apcir.interactive.search_server / pipeline).

export interface User {
  id: number
  username: string
  is_admin: number
}

// One selectable query-encoder checkpoint of a dense unit (all choices search the SAME doc index).
export interface EncoderChoice {
  label: string // formal display name, e.g. "Pers-Conv-Qwen3-0.6B"
  path: string // checkpoint dir
  leg_name: string // backend dispatch family: ance | conv-ance | qwen3 | conv-qwen3
  default_query_type: string
}

// Feasibility of one dense load mode on the CURRENT machine state (advisory; server re-checks).
export interface LoadModeInfo {
  fits: boolean
  reason: string
  ram_gb: number
  vram_gb: number
}

export interface ModelUnit {
  name: string
  kind: string // dense | sparse | splade | reranker | llm
  corpus?: string | null // clueweb | qrecc | topiocqa | null (reranker is corpus-agnostic)
  resident_ram_gb: number
  load_peak_ram_gb: number
  vram_gb: number
  dtype: string | null
  query_encoder?: string | null
  query_encoders?: EncoderChoice[] | null // selectable encoder checkpoints (dense units)
  load_modes?: Record<string, LoadModeInfo> // dense: ram_fp16 | gpu_resident | pq_refine
  available: boolean
}

export interface ModelsStatus {
  units: ModelUnit[]
  resident: string[]
  resident_modes?: Record<string, string> // dense unit -> its CURRENT load mode
  free_ram_gb: number
  free_vram_gb: number[]
}

export interface RetrieverLeg {
  name: string
  query_type?: string
  qr?: string
  encoder_path?: string | null
  unit?: string | null
  encoder_label?: string | null // short display label; disambiguates multi-encoder legs on one unit
}

export interface SearchRequest {
  utterance: string
  history?: string[] // interleaved [u1, r1, u2, r2, ...]
  ptkb?: string[]
  topic_id?: string
  user_id?: string
  turn_index?: number
  session_id?: number | null
  extract_ptkb?: boolean
  // RunSpec overrides (null/undefined -> server default)
  retrievers?: RetrieverLeg[] | null
  fusion_type?: string | null
  reranker?: string | null
  generation?: string | null
  generation_top_k?: number | null
  retrieval_top_k?: number | null
  cite_passages?: boolean | null
}

export interface CitationSpan {
  n: number
  docid: string
  start: number
  end: number
}

export interface PerRetriever {
  retriever: string
  hits: [string, number][] // [docid, score]
}

export interface SearchResponse {
  response: string
  citations: Record<string, number> // docid -> score (top-N)
  hits: [string, number][] // fused/reranked [docid, score]
  ptkb_provenance: string[]
  qid: string
  per_retriever: PerRetriever[]
  shared_docs: Record<string, string[]> // docid -> retrievers it appears in (>=2)
  reformulations: Record<string, string[]> // leg label -> query string(s)
  citation_spans: CitationSpan[]
  persisted: boolean
  extracted_ptkb?: string[] // NEW user-profile facts learned this turn (absent on reloaded turns)
}

export interface Session {
  id: number
  title: string
  created_at: number
  updated_at: number
}

export interface Turn {
  id: number
  idx: number
  utterance: string
  response: string
  payload: Record<string, unknown>
  created_at: number
}

export interface PtkbItem {
  id: number
  statement: string
  source: string
  created_at: number
}

export interface ActivatePlan {
  to_load: string[]
  to_unload: string[]
}

export interface ActivateResponse {
  task_id: string
  plan: ActivatePlan
}

export interface ActivateStatus {
  state: 'running' | 'done' | 'error'
  progress: { msg: string; frac: number }[]
  resident: string[]
  error: string | null
}
