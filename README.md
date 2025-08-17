# Regex Playground

Playground per testare espressioni regolari.
- **Frontend**: Vite + React + TypeScript
- **Backend**: FastAPI (Python)

## Requisiti
- Node.js 18+ (o 20+)
- Python 3.10+ (consigliato 3.11)
- `pip`

## Avvio rapido (2 terminali)

### 1) Backend
bash
cd backend
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate

# dipendenze
pip install -r requirements.txt || pip install fastapi uvicorn pydantic

# avvio
uvicorn app.main:app --reload --port 8000

### 2) Frontend
cd frontend
# imposta l'URL del backend
echo "VITE_API_BASE=http://127.0.0.1:8000" > .env
npm ci
npm run dev
