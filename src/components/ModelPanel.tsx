import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { nextActiveSet } from '../lib/activeSet'
import { corpusLabel, modelLabel } from '../lib/labels'
import { QUERY_TYPES, asQueryType, defaultSelections, type EncoderSel, type QueryType } from '../lib/retrievers'
import type { ActivatePlan, ActivateStatus, EncoderChoice, ModelsStatus, ModelUnit } from '../lib/types'

const CORPUS_ORDER = ['clueweb', 'qrecc', 'topiocqa']
const RETRIEVAL_KINDS = ['dense', 'sparse', 'splade']

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const s = new Set(a)
  return b.every((x) => s.has(x))
}

function Gauge({ label, used, free }: { label: string; used: number; free: number }) {
  const frac = free > 0 ? Math.min(1, used / free) : used > 0 ? 1 : 0
  const over = used > free
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-muted">{label}</span>
      <div className="h-2.5 w-16 overflow-hidden rounded bg-paper ring-1 ring-line">
        <div
          className={`h-full ${over ? 'bg-red-500' : 'bg-teal'}`}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
      <span className={over ? 'font-medium text-red-600' : 'text-muted'}>
        {used.toFixed(0)}/{free.toFixed(0)}G
      </span>
    </div>
  )
}

export function ModelPanel({
  onClose,
  onActivated,
  queryTypes,
  onQueryType,
  encoderSels,
  onEncoderSels,
}: {
  onClose: () => void
  onActivated: (m: ModelsStatus) => void
  queryTypes: Record<string, QueryType> // sparse/splade legs: per-unit query formulation
  onQueryType: (unit: string, qt: QueryType) => void
  encoderSels: Record<string, EncoderSel[]> // dense legs: selected encoders (each with its own QR)
  // updater semantics (not a plain setter) so rapid toggles can't clobber each other under batching
  onEncoderSels: (unit: string, update: (cur: EncoderSel[] | undefined) => EncoderSel[]) => void
}) {
  const [models, setModels] = useState<ModelsStatus | null>(null)
  const [desired, setDesired] = useState<string[]>([])
  const [activating, setActivating] = useState(false)
  const [plan, setPlan] = useState<ActivatePlan | null>(null)
  const [progress, setProgress] = useState<ActivateStatus | null>(null)
  const [error, setError] = useState('')
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    api
      .models()
      .then((m) => {
        if (!alive.current) return
        setModels(m)
        setDesired(m.resident)
      })
      .catch((e) => alive.current && setError(e instanceof Error ? e.message : String(e)))
    return () => {
      alive.current = false
    }
  }, [])

  function toggle(name: string) {
    if (!models || activating) return
    setDesired((d) => nextActiveSet(d, name, models.units))
  }

  async function apply() {
    if (!models) return
    setError('')
    setActivating(true)
    setProgress(null)
    setPlan(null)
    try {
      const res = await api.activate(desired)
      if (alive.current) setPlan(res.plan)
      for (let i = 0; ; i++) {
        if (!alive.current) return
        const st = await api.activateStatus(res.task_id)
        if (alive.current) setProgress(st)
        if (st.state !== 'running') {
          if (st.state === 'error') throw new Error(st.error ?? 'activation failed')
          break
        }
        if (i > 1200) throw new Error('activation timed out')
        await new Promise((r) => setTimeout(r, 500))
      }
      const fresh = await api.models()
      if (!alive.current) return
      setModels(fresh)
      setDesired(fresh.resident)
      onActivated(fresh)
    } catch (err) {
      if (alive.current) setError(err instanceof Error ? err.message : 'activation failed')
    } finally {
      if (alive.current) setActivating(false)
    }
  }

  const dirty = models ? !sameSet(desired, models.resident) : false
  const last = progress?.progress.at(-1)
  const frac = last?.frac ?? (progress?.state === 'done' ? 1 : 0)

  const unitsByCorpus = (corpus: string): ModelUnit[] =>
    (models?.units ?? []).filter(
      (u) => RETRIEVAL_KINDS.includes(u.kind) && (u.corpus ?? 'other') === corpus,
    )
  const rerankers = (models?.units ?? []).filter((u) => u.kind === 'reranker')
  const selectedUnits = (models?.units ?? []).filter((u) => desired.includes(u.name))
  const needRam = selectedUnits.reduce((s, u) => s + u.resident_ram_gb, 0)
  const GPU_TOTAL = 24 // A5000 24G; used_i = total - free_i

  const QtSelect = ({ value, onChange }: { value: QueryType; onChange: (qt: QueryType) => void }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as QueryType)}
      title="query formulation"
      onClick={(e) => e.stopPropagation()}
      className="rounded border border-line bg-cream px-1 py-0.5 text-xs text-muted outline-none"
    >
      {QUERY_TYPES.map((q) => (
        <option key={q} value={q}>
          {q}
        </option>
      ))}
    </select>
  )

  const Row = ({ unit }: { unit: ModelUnit }) => {
    const selected = desired.includes(unit.name)
    const resident = models!.resident.includes(unit.name)
    const isRetrieval = RETRIEVAL_KINDS.includes(unit.kind)
    const choices = unit.kind === 'dense' ? (unit.query_encoders ?? []) : []
    const sels = encoderSels[unit.name] ?? defaultSelections(unit)
    const selFor = (c: EncoderChoice) => sels.find((s) => s.path === c.path)
    const toggleEncoder = (c: EncoderChoice) =>
      onEncoderSels(unit.name, (curM) => {
        const cur = curM ?? defaultSelections(unit)
        const has = cur.some((s) => s.path === c.path)
        if (has && cur.length <= 1) return cur // keep at least one encoder searching
        const next = has
          ? cur.filter((s) => s.path !== c.path)
          : [
              ...cur,
              { path: c.path, label: c.label, legName: c.leg_name, queryType: asQueryType(c.default_query_type) },
            ]
        // keep the panel's display order
        next.sort(
          (a, b) => choices.findIndex((c2) => c2.path === a.path) - choices.findIndex((c2) => c2.path === b.path),
        )
        return next
      })
    const setEncoderQt = (c: EncoderChoice, qt: QueryType) =>
      onEncoderSels(unit.name, (curM) =>
        (curM ?? defaultSelections(unit)).map((s) => (s.path === c.path ? { ...s, queryType: qt } : s)),
      )

    return (
      <div
        className={`rounded-lg border px-3 py-2 text-sm ${
          selected ? 'border-clay/50 bg-clay/5' : 'border-line bg-paper'
        } ${unit.available ? '' : 'opacity-45'}`}
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            disabled={!unit.available || activating}
            onChange={() => toggle(unit.name)}
            className="accent-clay"
          />
          <span className="font-medium">{modelLabel(unit)}</span>
          {resident && (
            <span className="rounded bg-teal/15 px-1.5 text-[0.7em] font-semibold text-teal">resident</span>
          )}
          {!unit.available && <span className="text-xs italic text-muted">currently not supported</span>}
          {selected && isRetrieval && choices.length === 0 && (
            <QtSelect
              value={
                unit.kind === 'dense'
                  ? sels[0]?.queryType ?? 'raw'
                  : queryTypes[unit.name] ?? 'raw'
              }
              onChange={(qt) =>
                unit.kind === 'dense'
                  ? onEncoderSels(unit.name, () => [{ ...defaultSelections(unit)[0], queryType: qt }])
                  : onQueryType(unit.name, qt)
              }
            />
          )}
          <span className="ml-auto text-xs text-muted">
            {unit.resident_ram_gb >= 1 && `${unit.resident_ram_gb}G`}
            {unit.vram_gb > 0 && ` · ${unit.vram_gb}G vram`}
          </span>
        </div>

        {/* Query-encoder choices: several checkpoints search this SAME index (one grid column each,
            nearly free — the backend batches them into one corpus pass). Each row has its own QR. */}
        {selected && choices.length > 0 && (
          <div className="mt-1.5 space-y-1 border-l-2 border-line pl-3">
            {choices.map((c) => {
              const on = !!selFor(c)
              return (
                <div key={c.path} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={activating}
                    onChange={() => toggleEncoder(c)}
                    className="accent-teal"
                    title={c.path}
                  />
                  <span className={on ? 'text-ink' : 'text-muted'}>{c.label}</span>
                  {on && (
                    <QtSelect value={selFor(c)!.queryType} onChange={(qt) => setEncoderQt(c, qt)} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-black/30 p-4"
      onClick={() => !activating && onClose()}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-cream shadow-xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-line px-5 py-3">
          <span className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            Select corpora and models
          </span>
          {models && (
            <div className="mt-2 space-y-1">
              <Gauge label="RAM need" used={needRam} free={models.free_ram_gb} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-xs text-muted">VRAM</span>
                {models.free_vram_gb.map((free, i) => (
                  <Gauge key={i} label={`G${i}`} used={Math.max(0, GPU_TOTAL - free)} free={GPU_TOTAL} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!models && !error && <p className="text-sm text-muted">loading…</p>}

          {CORPUS_ORDER.map((corpus) => {
            const us = unitsByCorpus(corpus)
            if (!models) return null
            return (
              <div key={corpus} className="mb-4">
                <div className="mb-1 text-sm font-semibold">{corpusLabel(corpus)}</div>
                {us.length === 0 ? (
                  <p className="px-1 text-xs italic text-muted">currently not supported</p>
                ) : (
                  <div className="space-y-1">
                    {us.map((u) => (
                      <Row key={u.name} unit={u} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {rerankers.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 text-sm font-semibold">
                Reranker <span className="text-xs font-normal text-muted">(any corpus)</span>
              </div>
              <div className="space-y-1">
                {rerankers.map((u) => (
                  <Row key={u.name} unit={u} />
                ))}
              </div>
            </div>
          )}

          {plan && (plan.to_load.length > 0 || plan.to_unload.length > 0) && (
            <p className="mt-2 text-xs text-muted">
              {plan.to_load.length > 0 && <>load: {plan.to_load.join(', ')}. </>}
              {plan.to_unload.length > 0 && <>evict: {plan.to_unload.join(', ')}.</>}
            </p>
          )}
          {progress && (
            <div className="mt-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-paper ring-1 ring-line">
                <div
                  className="h-full rounded-full bg-clay transition-all"
                  style={{ width: `${Math.round(frac * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">{last?.msg ?? progress.state}</p>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-5 py-3">
          <span className="text-xs text-muted">
            {desired.length} selected{dirty ? ' · unsaved' : ''}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={onClose}
              disabled={activating}
              className="rounded-lg border border-line bg-paper px-4 py-2 text-sm transition hover:bg-cream disabled:opacity-50"
            >
              Close
            </button>
            <button
              onClick={apply}
              disabled={!dirty || activating}
              className="rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {activating ? 'Applying…' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
