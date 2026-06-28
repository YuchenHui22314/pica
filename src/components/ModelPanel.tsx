import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { nextActiveSet } from '../lib/activeSet'
import type { ActivatePlan, ActivateStatus, ModelsStatus, ModelUnit } from '../lib/types'

const KIND_ORDER = ['dense', 'sparse', 'splade', 'reranker', 'llm']

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const s = new Set(a)
  return b.every((x) => s.has(x))
}

export function ModelPanel({
  onClose,
  onActivated,
}: {
  onClose: () => void
  onActivated: (m: ModelsStatus) => void
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
        if (!alive.current) return // unmounted: stop polling entirely
        const st = await api.activateStatus(res.task_id)
        if (alive.current) setProgress(st)
        if (st.state !== 'running') {
          if (st.state === 'error') throw new Error(st.error ?? 'activation failed')
          break
        }
        if (i > 1200) throw new Error('activation timed out (still running after ~10 min)')
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

  const byKind = (kind: string): ModelUnit[] => models?.units.filter((u) => u.kind === kind) ?? []

  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center bg-black/30 p-4"
      onClick={() => !activating && onClose()}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-cream shadow-xl ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <span className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            Models
          </span>
          {models && (
            <span className="ml-2 text-xs text-muted">
              RAM free {models.free_ram_gb} GB
              {models.free_vram_gb.length > 0 && ` · VRAM free [${models.free_vram_gb.join(', ')}] GB`}
            </span>
          )}
          <button
            onClick={onClose}
            disabled={activating}
            className="ml-auto text-sm text-muted hover:text-ink disabled:opacity-40"
          >
            close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!models && !error && <p className="text-sm text-muted">loading…</p>}
          {KIND_ORDER.filter((k) => byKind(k).length > 0).map((kind) => (
            <div key={kind} className="mb-4">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{kind}</div>
              <div className="space-y-1">
                {byKind(kind).map((unit) => {
                  const selected = desired.includes(unit.name)
                  const resident = models!.resident.includes(unit.name)
                  return (
                    <label
                      key={unit.name}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
                        selected ? 'border-clay/50 bg-clay/5' : 'border-line bg-paper'
                      } ${unit.available ? '' : 'opacity-40'}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!unit.available || activating}
                        onChange={() => toggle(unit.name)}
                        className="accent-clay"
                      />
                      <span className="font-medium">{unit.name}</span>
                      {resident && (
                        <span className="rounded bg-teal/15 px-1.5 text-[0.7em] font-semibold text-teal">
                          resident
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted">
                        {unit.resident_ram_gb > 0 && `${unit.resident_ram_gb}G ram`}
                        {unit.vram_gb > 0 && ` · ${unit.vram_gb}G vram`}
                        {!unit.available && ' · missing'}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

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
          <button
            onClick={apply}
            disabled={!dirty || activating}
            className="ml-auto rounded-lg bg-clay px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {activating ? 'Applying…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  )
}
