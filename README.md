# Regex Playground

Playground per testare espressioni regolari con evidenziazione match, tabella risultati e flag (`IGNORECASE`, `MULTILINE`, `DOTALL`).  
Frontend: **Vite + React + TypeScript** • Backend: **FastAPI (Python)**

Funzionalità
- Esecuzione regex con evidenziazione del testo
- Tabella risultati con indici `start`/`end`
- Flag configurabili
- Auto-run con debounce, scorciatoia **Ctrl/Cmd+Enter**
- Stato ↔ URL (link condivisibile) + bottone **Copia link**
- (Se il backend lo fornisce) gruppi di cattura posizionali e nominati


Requisiti
- **Node.js** 18+ (o 20+)
- **Python** 3.10+ (consigliato 3.11)
- `pip` per installare le dipendenze Python

---

Avvio locale

1) Backend (FastAPI)
(bash)
cd backend
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate

# Se c'è requirements.txt:
pip install -r requirements.txt
# Altrimenti:
pip install fastapi uvicorn pydantic



uvicorn app.main:app --reload --port 8000

