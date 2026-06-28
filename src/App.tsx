// M0 landing — branded hero. The app shell (login → activate → search) lands in M1+.
export default function App() {
  return (
    <main className="min-h-full grid place-items-center px-6 py-16 text-center">
      <div className="max-w-2xl">
        <img
          src="/pica-logo.svg"
          alt="Magpie"
          width={160}
          height={160}
          className="mx-auto drop-shadow-sm"
        />

        <h1
          className="mt-6 text-6xl tracking-tight text-ink"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Magpie
        </h1>

        <p className="mt-4 text-lg leading-relaxed text-muted">
          A <span className="text-ink font-medium">Personalized Information-seeking Conversational
          Agent</span> that brings back the web's brightest passages.
        </p>

        <p className="mt-6 text-sm text-muted">
          <span className="rounded-full bg-paper px-3 py-1 ring-1 ring-line">
            <span className="text-clay font-semibold">pica</span> · PICA · <i>Pica pica</i>
          </span>
        </p>

        <div className="mt-10 h-px w-24 mx-auto bg-line" />
        <p className="mt-6 text-sm text-muted">
          conversational search over ClueWeb22-B — swap retrievers on the fly, answer with cited passages.
          <br />
          <span className="opacity-70">UI in progress · M0 scaffold</span>
        </p>
      </div>
    </main>
  )
}
