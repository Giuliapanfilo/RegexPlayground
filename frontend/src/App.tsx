import React, { useEffect, useMemo, useRef, useState } from "react";
import { runRegex, type MatchRow, type Flags } from "./lib/api";
import "./App.css";

export default function App() {
	const [text, setText] = useState(
		"Contattaci a info@example.com e support@test.org"
	);

  const PRESETS = [
  { label: "Email (gruppi nominati)", value: "(?P<user>[A-Za-z0-9._%+-]+)@(?P<domain>[A-Za-z0-9.-]+)\\.(?P<tld>[A-Za-z]{2,})" },
  { label: "URL semplice", value: "(https?)://([^/\\s]+)(/\\S*)?" },
  { label: "IPv4", value: "\\b(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\b" },
  { label: "Data (YYYY-MM-DD)", value: "\\b(\\d{4})-(\\d{2})-(\\d{2})\\b" },
  { label: "IBAN (bozza)", value: "\\b([A-Z]{2})(\\d{2})([A-Z0-9]{1,30})\\b" },
  ];

	const [pattern, setPattern] = useState(
		"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[A-Za-z]{2,}"
	);
	const [flags, setFlags] = useState<Flags>({
		IGNORECASE: true,
		MULTILINE: false,
		DOTALL: false
	});
	const [rows, setRows] = useState<MatchRow[]>([]);
	const [err, setErr] = useState("");
	const [pending, setPending] = useState(false);

	// Per Ctrl/Cmd+Enter
	const runBtnRef = useRef<HTMLButtonElement | null>(null);

	// Debounce semplice su input
	const debouncedInputs = useDebounce({ text, pattern, flags }, 250);

	// Evita auto-run duplicati in StrictMode (dev)
	const lastRunKeyRef = useRef<string>("");

	// “Ultima risposta vince”
	const runIdRef = useRef(0);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  function prevMatch() {
    if (!rows.length) return;
    setActiveIdx((i) => (i === null ? 0 : (i - 1 + rows.length) % rows.length));
  }
  function nextMatch() {
    if (!rows.length) return;
    setActiveIdx((i) => (i === null ? 0 : (i + 1) % rows.length));
  }



  // parse stato iniziale da URL
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const t = p.get("t"); const r = p.get("r");
    const ic = p.get("ic"); const ml = p.get("ml"); const ds = p.get("ds");
    if (t !== null) setText(t);
    if (r !== null) setPattern(r);
    setFlags({
      IGNORECASE: ic === "1",
      MULTILINE:  ml === "1",
      DOTALL:     ds === "1",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    p.set("t", debouncedInputs.text);
    p.set("r", debouncedInputs.pattern);
    p.set("ic", debouncedInputs.flags.IGNORECASE ? "1" : "0");
    p.set("ml", debouncedInputs.flags.MULTILINE ? "1" : "0");
    p.set("ds", debouncedInputs.flags.DOTALL ? "1" : "0");
    window.history.replaceState(null, "", "?" + p.toString());
  }, [debouncedInputs]);


	useEffect(() => {
		const key = JSON.stringify(debouncedInputs);
		if (lastRunKeyRef.current === key) return; // dedupe
		lastRunKeyRef.current = key;
		onRun(debouncedInputs.text, debouncedInputs.pattern, debouncedInputs.flags);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedInputs]);

	async function onRun(t = text, p = pattern, f = flags) {
		setErr("");

		// imposta pending subito
		setPending(true);

		// id per “ultima risposta vince”
		const id = ++runIdRef.current;

		// durata minima per evitare flicker
		const started = Date.now();
		const MIN = 160; // ms, regola a piacere (100–250)

		try {
			const res = await runRegex(t, p, f, 5000);
			if (id !== runIdRef.current) return; // risposta superata
			setRows(res.matches);
		} catch (e: any) {
			if (id !== runIdRef.current) return;
			setRows([]);
			setErr(e?.message || "Errore");
		} finally {
			if (id !== runIdRef.current) return;
			const elapsed = Date.now() - started;
			const wait = Math.max(0, MIN - elapsed);
			setTimeout(() => {
				// ricontrollo: magari nel frattempo un altro run è partito
				if (id === runIdRef.current) setPending(false);
			}, wait);
		}
	}

	// Ranges per evidenziazione
  const ranges = useMemo(
    () => rows.map((r, i) => ({ start: r.start, end: r.end, i })),
    [rows]
  );

	// Shortcut: Ctrl/Cmd+Enter
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
				e.preventDefault();
				runBtnRef.current?.click();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<div className="app">
			<header className="app-header">
				<h1 className="title">Regex Playground</h1>
				<div className="header-actions">

          <button onClick={() => navigator.clipboard.writeText(window.location.href)}>
            Copia link
          </button>

					<button ref={runBtnRef} onClick={() => onRun()} disabled={pending}>
						{pending ? "Esecuzione…" : "Esegui (Ctrl+Enter)"}
					</button>
					<span className="muted">Match: {rows.length}</span>
				</div>
			</header>

			<aside className="app-sidebar">
				<section className="panel">
					<h2 className="panel-title">Opzioni</h2>
					<Toggle
						label="IGNORECASE"
						checked={flags.IGNORECASE}
						onChange={(v) => setFlags({ ...flags, IGNORECASE: v })}
					/>
					<Toggle
						label="MULTILINE"
						checked={flags.MULTILINE}
						onChange={(v) => setFlags({ ...flags, MULTILINE: v })}
					/>
					<Toggle
						label="DOTALL"
						checked={flags.DOTALL}
						onChange={(v) => setFlags({ ...flags, DOTALL: v })}
					/>
				</section>
        <div className="panel" style={{ marginTop: 8 }}>
          <label className="label">Preset</label>
          <select
            className="input preset-select"
            onChange={(e) => setPattern(e.target.value)}
            defaultValue=""
          >
            <option value="" disabled>Seleziona un pattern…</option>
            {PRESETS.map(p => <option key={p.label} value={p.value}>{p.label}</option>)}
          </select>
        </div>


				{err && (
					<div className="error">
						<span>⚠️ {err}</span>
					</div>
				)}
			</aside>

			<main className="app-main">
				{/* Editor: sempre in colonna */}
				<section className="panel editor">
					<label className="label">Testo</label>
					<textarea
						rows={10}
						value={text}
						onChange={(e) => setText(e.target.value)}
						className="textarea monospace"
						placeholder="Incolla qui il testo su cui provare la regex…"
					/>
				</section>


        <div>
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={(e)=>{
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => setText(String(r.result ?? ""));
              r.readAsText(f);
            }}
          />
          <button onClick={()=>{
            const blob = new Blob([text], {type:"text/plain;charset=utf-8"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "input.txt"; a.click();
            URL.revokeObjectURL(url);
          }}>
            Esporta .txt
          </button>
        </div>




				<section className="panel editor">
					<label className="label">Regex</label>
					<input
						value={pattern}
						onChange={(e) => setPattern(e.target.value)}
						className="input monospace"
						placeholder="Inserisci l'espressione regolare"
					/>
				</section>



				<section className="panel">
					<h3 className="panel-title">Highlight</h3>
					<div className="highlight-box">
						<pre className="pre">{highlight(text, ranges, activeIdx)}</pre>
					</div>
				</section>

        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="panel-title">Risultati</h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={prevMatch} disabled={!rows.length}>Precedente</button>
              <button onClick={nextMatch} disabled={!rows.length}>Successivo</button>
            </div>
          </div>


          {rows.length > 0 ? (
            <>
              {/* Tabella match base */}
              <table className="table">
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>match</Th>
                    <Th>start</Th>
                    <Th>end</Th>
                  </tr>
                </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={activeIdx === i ? "row-selected" : ""}
                      >
                        <Td>{i + 1}</Td>
                        <Td><code>{r.match}</code></Td>
                        <Td>{r.start}</Td>
                        <Td>{r.end}</Td>
                      </tr>
                    ))}
                  </tbody>

              </table>

              {/* Se ci sono gruppi, mostrali sotto */}
              {hasAnyGroup(rows) && (
              <>
                <h4 className="panel-title" style={{ marginTop: 12 }}>Gruppi di cattura</h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {rows.map((r, i) => {
                    const hasPositional = !!(r.groups && r.groups.length);
                    const hasNamed = !!(r.namedGroups && Object.keys(r.namedGroups).length);
                    if (!hasPositional && !hasNamed) return null;

                    return (
                      <li key={`g-${i}`} style={{ marginBottom: 8 }}>
                        <div className="muted" style={{ marginBottom: 4 }}>
                          Match #{i+1}: <code>{r.match}</code>
                        </div>

                        {hasPositional && (
                          <div style={{ marginBottom: 4 }}>
                            {r.groups!.map((g, gi) => (
                              <span key={gi} style={{ marginRight: 12 }}>
                                <strong>${gi+1}:</strong> <code>{g ?? ""}</code>
                              </span>
                            ))}
                          </div>
                        )}

                        {hasNamed && (
                          <div>
                            {Object.entries(r.namedGroups as Record<string, string | null>).map(([name, val]) => (
                              <span key={name} style={{ marginRight: 12 }}>
                                <strong>{name}:</strong> <code>{val ?? ""}</code>
                              </span>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            </>
          ) : (
            <p className="muted">Nessun risultato.</p>
          )}
        </section>

			</main>

			<footer className="app-footer">
				<span className="muted">© Regex Playground</span>
			</footer>
		</div>
	);
}

/* ---------- Componenti UI minimi ---------- */
function Toggle({
	label,
	checked,
	onChange
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="toggle">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<span>{label}</span>
		</label>
	);
}

function Th({ children }: { children: React.ReactNode }) {
	return <th className="th">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
	return <td className="td">{children}</td>;
}

/* ---------- Utility ---------- */
function useDebounce<T>(value: T, delay = 250): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const id = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(id);
	}, [value, delay]);
	return debounced;
}

/* ---------- Evidenziazione ---------- */
function highlight(
  text: string,
  ranges: { start: number; end: number; i: number }[],
  activeIdx: number | null
) {
  if (!text) return null;

  type Seg = { s: number; e: number; hit: boolean; idx?: number };
  const segs: Seg[] = [];
  let cursor = 0;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);

  for (const r of sorted) {
    if (r.start > cursor) segs.push({ s: cursor, e: r.start, hit: false });
    segs.push({ s: r.start, e: r.end, hit: true, idx: r.i });
    cursor = r.end;
  }
  if (cursor < text.length) segs.push({ s: cursor, e: text.length, hit: false });

  return segs.map((p, i) =>
    p.hit ? (
      <mark
        key={i}
        className={p.idx === activeIdx ? "hit selected" : "hit"}
        data-hit={p.idx}
        ref={(el) => {
          if (p.idx === activeIdx && el) {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }}
      >
        {text.slice(p.s, p.e)}
      </mark>
    ) : (
      <span key={i}>{text.slice(p.s, p.e)}</span>
    )
  );
}


function hasAnyGroup(rows: MatchRow[]) {
  return rows.some(
    r => (r.groups && r.groups.length > 0) ||
         (r.namedGroups && Object.keys(r.namedGroups).length > 0)
  );
}
