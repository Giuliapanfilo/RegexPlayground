from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from .regex_utils import MatchRequest, run_finditer, MAX_TEXT_BYTES


EXECUTION_TIMEOUT_SEC = 1.5  # ~1.5s soft timeout
app = FastAPI(title="Regex Playground API", version="0.1")

# CORS: permette al frontend (vite su :5173) di chiamare il backend (:8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ping")
def ping():
    return {"msg": "pong"}

@app.post("/api/regex/match")
def regex_match(req: MatchRequest):
    # 413 se input eccessivo
    if len(req.text.encode("utf-8")) > MAX_TEXT_BYTES:
        raise HTTPException(status_code=413, detail="Text too large (max 2MB).")

    # esecuzione con timeout
    with ThreadPoolExecutor(max_workers=1) as ex:
        fut = ex.submit(run_finditer, req)
        try:
            result = fut.result(timeout=EXECUTION_TIMEOUT_SEC)
        except FuturesTimeoutError:
            raise HTTPException(status_code=408, detail="Regex evaluation timeout.")

    if result.get("error"):
        # es. RegexSyntax
        raise HTTPException(status_code=422, detail=result["error"])
    return result


