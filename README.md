# AutoSpec AI

AutoSpec AI is a full-stack automotive RAG workspace for asking vehicle-manual questions, validating safety-critical answers, uploading public manuals, and inspecting the retrieval pipeline.

The app combines a Next.js frontend, FastAPI backend, MongoDB retrieval store, Vertex AI generation/embedding, and Voyage AI reranking.

### Live at: https://auto-spec-ai.vercel.app/

## Features

- Authenticated SaaS-style interface
- Persistent user chat history
- General grounded automotive chat
- Critical query workflows for maintenance, warranty, safety, emergency, and diagnostics
- Public PDF manual upload into the shared RAG knowledge base
- LLM semantic chunking for uploaded manuals
- Hybrid retrieval using vector search + BM25
- Voyage AI reranking
- A2UI structured response rendering
- Pipeline debugger and health checks
- Vercel frontend deployment
- Render backend deployment

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python, Uvicorn |
| Database | MongoDB |
| AI generation | Google Vertex AI / Gemini |
| Embeddings | Vertex AI text embeddings |
| Reranking | Voyage AI |
| Retrieval | Vector search, BM25, hybrid fusion |
| Deployment | Vercel frontend, Render backend |

## Project Structure

```text
.
├── Vector-RAG/
│   ├── app/                    # FastAPI backend
│   │   ├── routes/             # API routes
│   │   ├── services/           # Query, auth, ingest, chat history services
│   │   ├── retrieval/          # Semantic, BM25, hybrid, rerank retrieval
│   │   ├── db/                 # MongoDB clients and collections
│   │   └── config/             # Environment-backed settings
│   ├── frontend/               # Next.js frontend
│   │   ├── src/app/            # App Router pages
│   │   ├── src/components/     # UI, chat, A2UI, layout components
│   │   ├── src/services/       # API client and A2UI adapter
│   │   └── public/             # Logo and static assets
│   ├── utils/                  # Ingestion, chunking, embeddings helpers
│   ├── ingest.py               # Canonical ingestion entrypoint
│   ├── requirements.txt        # Backend dependencies
│   ├── render.yaml             # Render backend blueprint
│   └── DEPLOYMENT.md           # Deployment guide
├── render.yaml                 # Root Render blueprint
└── vercel.json                 # Root Vercel routing/build config
```

## Local Setup

### 1. Backend

```bash
cd Vector-RAG
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `Vector-RAG/.env`:

```bash
MONGO_URI=mongodb://localhost:27017/
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
VERTEX_PROJECT=your-gcp-project-id
VERTEX_LOCATION=us-central1
GENERATION_MODEL=gemini-2.5-flash-lite
ROUTER_MODEL=gemini-2.5-flash
EXTRACTION_MODEL=gemini-2.5-flash
VOYAGE_API_KEY=your-voyage-api-key
AUTH_SECRET=replace-with-a-long-random-secret
AUTH_TOKEN_TTL_SECONDS=604800
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

Start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend runs at:

```text
http://localhost:8000
```

Health check:

```text
http://localhost:8000/health
```

### 2. Frontend

```bash
cd Vector-RAG/frontend
npm ci
```

Create `Vector-RAG/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Frontend runs at:

```text
http://localhost:3000
```

## Environment Variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `AUTH_SECRET` | Yes | Signs auth tokens |
| `AUTH_TOKEN_TTL_SECONDS` | No | Auth token lifetime |
| `CORS_ORIGINS` | Yes | Allowed frontend origins |
| `VERTEX_PROJECT` | Yes | Google Cloud project ID |
| `VERTEX_LOCATION` | Yes | Vertex AI region |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local | Path to service account JSON |
| `VERTEX_CREDENTIALS` | Deploy | Full service account JSON as an env value |
| `GENERATION_MODEL` | No | Gemini generation model |
| `ROUTER_MODEL` | No | Gemini routing model |
| `EXTRACTION_MODEL` | No | Gemini extraction/chunking model |
| `VOYAGE_API_KEY` | Yes | Voyage reranking |
| `MLFLOW_TRACKING_URI` | Optional | Evaluation tracking |
| `JUDGE_MODEL` | Optional | Evaluation judge model |

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Public backend API URL |

## Deployment

Deployment is split by service:

- Frontend: Vercel, root directory `Vector-RAG/frontend`
- Backend: Render, root directory `Vector-RAG`

Detailed deployment steps are in:

[Vector-RAG/DEPLOYMENT.md](Vector-RAG/DEPLOYMENT.md)

### Render Backend

Required production env vars:

```bash
MONGO_URI=...
AUTH_SECRET=...
CORS_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
VERTEX_PROJECT=...
VERTEX_LOCATION=us-central1
VERTEX_CREDENTIALS=<full service account JSON>
VOYAGE_API_KEY=...
```

### Vercel Frontend

Required production env var:

```bash
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
```

After both deploys are live, update Render `CORS_ORIGINS` with the final Vercel domain and redeploy the backend.

## Core API Routes

| Route | Purpose |
| --- | --- |
| `GET /health` | API and MongoDB health |
| `POST /auth/signup` | Register user |
| `POST /auth/login` | Login |
| `GET /auth/me` | Validate current user |
| `POST /chat-sessions` | Create chat session |
| `GET /chat-sessions` | List user chat sessions |
| `GET /chat-sessions/{id}` | Fetch session and messages |
| `POST /chat-sessions/{id}/messages` | Save message |
| `POST /query` | General grounded RAG answer |
| `POST /query/critical` | Critical structured answer |
| `POST /debug/retrieve` | Inspect retrieval pipeline |
| `POST /ingest/upload-pdf` | Upload public vehicle manual |

## Retrieval Pipeline

```text
User question
  → query parsing / routing
  → dense vector retrieval
  → BM25 retrieval
  → hybrid fusion
  → Voyage AI reranking
  → Gemini grounded answer
  → A2UI structured rendering
```

Uploaded PDF manuals follow:

```text
PDF upload
  → car-manual validation
  → LLM semantic chunking
  → metadata extraction
  → MongoDB storage
  → BM25 rebuild
  → available for future RAG queries
```

## Notes

- Uploaded manuals are treated as public shared knowledge-base data.
- Do not commit `.env`, `.env.local`, service account JSON files, API keys, MongoDB passwords, or other secrets.
- Voyage AI reranking is part of the intended retrieval path and should remain configured in production.
- Safety-critical vehicle guidance should always be verified against official manuals or professional service advice.

## Author

Created by Lakshya Bhatnagar.

- GitHub: [lakshyabhatnagar](https://github.com/lakshyabhatnagar)
- LinkedIn: [lakshya-bhatnagar1](https://linkedin.com/in/lakshya-bhatnagar1)
- Email: [lakshyabhatnagar1@gmail.com](mailto:lakshyabhatnagar1@gmail.com)
