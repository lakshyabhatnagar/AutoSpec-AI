# AutoSpec AI Deployment

This repo deploys as two services:

- Frontend: Next.js app in `Vector-RAG/frontend`, deployed on Vercel.
- Backend: FastAPI app in `Vector-RAG`, deployed on Render.

## Backend on Render

Use the root `render.yaml` blueprint from the repository root. It sets `rootDir: Vector-RAG`.

Render build command:

```bash
pip install -r requirements.txt
```

Render start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Required Render environment variables:

```bash
MONGO_URI=mongodb+srv://...
AUTH_SECRET=<long-random-secret>
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
VERTEX_PROJECT=<gcp-project-id>
VERTEX_LOCATION=us-central1
VERTEX_CREDENTIALS=<full service account JSON>
VOYAGE_API_KEY=<voyage-api-key>
```

Optional Render environment variables:

```bash
AUTH_TOKEN_TTL_SECONDS=604800
GENERATION_MODEL=gemini-2.5-flash-lite
ROUTER_MODEL=gemini-2.5-flash
EXTRACTION_MODEL=gemini-2.5-flash
MLFLOW_TRACKING_URI=sqlite:///mlflow.db
JUDGE_MODEL=vertex_ai:/gemini-2.5-flash-lite
```

`VERTEX_CREDENTIALS` is the recommended Render setup. Paste the full Google service account JSON as the env value. Locally, `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` still works.

## Frontend on Vercel

Recommended Vercel project settings:

- Root Directory: `Vector-RAG/frontend`
- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: leave default

Required Vercel environment variable:

```bash
NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com
```

After Vercel deploys, copy the final Vercel domain into Render:

```bash
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

## Local Run

Backend:

```bash
cd Vector-RAG
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd Vector-RAG/frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.
