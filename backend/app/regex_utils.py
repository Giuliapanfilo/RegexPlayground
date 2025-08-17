import re
import time
from typing import Any, Dict
from pydantic import BaseModel

MAX_TEXT_BYTES = 2 * 1024 * 1024  # 2 MB
MAX_MATCHES = 5000

class Flags(BaseModel):
    IGNORECASE: bool = False
    MULTILINE: bool = False
    DOTALL: bool = False

class MatchRequest(BaseModel):
    text: str
    pattern: str
    flags: Flags = Flags()
    max_matches: int = MAX_MATCHES


def _compute_flags(f: Flags) -> int:
    flags = 0
    if f.IGNORECASE:
        flags |= re.IGNORECASE
    if f.MULTILINE:
        flags |= re.MULTILINE
    if f.DOTALL:
        flags |= re.DOTALL
    return flags


def run_finditer(req: MatchRequest) -> Dict[str, Any]:
    if len(req.text.encode("utf-8")) > MAX_TEXT_BYTES:
        return {"error": {"type": "TooLarge", "message": "Text too large (max 2MB)."}}

    try:
        compiled = re.compile(req.pattern, _compute_flags(req.flags))
    except re.error as e:
        return {"error": {"type": "RegexSyntax", "message": str(e)}}

    matches = []
    groupindex = compiled.groupindex      # dict: nome -> posizione (int)
    group_count = compiled.groups         # numero di gruppi di cattura (esclude 0)
    count = 0
    start_t = time.perf_counter()

    for m in compiled.finditer(req.text):
        # gruppi posizionali (senza 0)
        groups = list(m.groups())  # len == group_count
        # span dei gruppi posizionali (None -> gruppo non presente)
        group_spans = []
        for i in range(1, group_count + 1):
            s, e = m.span(i)
            group_spans.append([s, e] if s != -1 else None)

        # gruppi nominati
        named = {k: m.group(k) for k in groupindex.keys()}
        named_spans = {}
        for k in groupindex.keys():
            s, e = m.span(k)
            named_spans[k] = ([s, e] if s != -1 else None)

        matches.append({
            "match": m.group(0),
            "start": m.start(),
            "end":   m.end(),
            "groups": groups,                    # solo 1..n
            "group_spans": group_spans,          # [[s,e] | None] * n
            "named_groups": named,               # {name: str|None}
            "named_group_spans": named_spans     # {name: [s,e]|None}
            # "groups_including_0": [m.group(0)] + groups,  # <- se vuoi compatibilità
        })

        count += 1
        if count >= req.max_matches:
            break

    elapsed_ms = int((time.perf_counter() - start_t) * 1000)

    return {
        "ok": True,
        "count": count,
        "matches": matches,
        "group_meta": {
            "count": group_count,                # ora non sommiamo +1
            "named": list(groupindex.keys())
        },
        "elapsed_ms": elapsed_ms
    }

