export type Flags = { IGNORECASE: boolean; MULTILINE: boolean; DOTALL: boolean };

// lib/api.ts
export type MatchRow = {
  match: string;
  start: number;
  end: number;
  groups?: string[];
  groupSpans?: Array<[number, number]>;
  namedGroups?: Record<string, string | undefined>;
  namedGroupSpans?: Record<string, [number, number] | undefined>;
};


export type MatchResponse = {
  ok: true;
  count: number;
  matches: MatchRow[];
  group_meta: { count: number; named: string[] };
  elapsed_ms: number;
};

const BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export async function runRegex(
  text: string,
  pattern: string,
  flags: Flags,
  max_matches = 5000
): Promise<MatchResponse> {
  const res = await fetch(`${BASE}/api/regex/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, pattern, flags, max_matches })
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const msg = (detail as any)?.detail?.message ?? (detail as any)?.detail ?? res.statusText;
    throw new Error(typeof msg === "string" ? msg : "Request error");
  }
  return res.json();
}

