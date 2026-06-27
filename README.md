# Enterprise RAG AI Document Search

An enterprise-grade Retrieval-Augmented Generation (RAG) system that lets employees ask natural language questions against uploaded company documents (PDF, DOCX, TXT) and receive grounded answers with source citations and confidence scores. If the answer is not in the documents, the system refuses to answer — zero hallucination by design.

## Prerequisites

- Python 3.11+
- Node.js 20+
- Google Gemini API key ([get one here](https://aistudio.google.com/apikey))
- Docker & Docker Compose (optional)

## Quick Start (Local Development)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the project root (or set the environment variable):

```bash
# From project root
cp .env.example .env
# Edit .env and add your Google Gemini API key
```

Start the API server:

```bash
cd backend
python main.py
```

The backend runs at **http://localhost:8000**. Swagger UI: **http://localhost:8000/docs**

### 2. Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at **http://localhost:3000**

### 3. End-to-End Test

1. Open http://localhost:3000
2. Switch to **Admin Hub** → upload a PDF/DOCX/TXT document
3. Switch to **Employee Chat** → ask a question about the document
4. Verify the answer includes source citations and a confidence score

## Docker

```bash
# From project root — ensure .env has GOOGLE_API_KEY set
docker-compose up --build
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3000

## Environment Variables

| Variable | Location | Description | Default |
|----------|----------|-------------|---------|
| `GOOGLE_API_KEY` | `.env` / backend | Google Gemini API key | — |
| `CHROMA_PERSIST_DIR` | backend | ChromaDB storage path | `./vector_db` |
| `SQLITE_DB_PATH` | backend | SQLite database path | `./database/enterprise_rag.db` |
| `EMBEDDING_MODEL` | backend | Google embedding model | `models/embedding-001` |
| `LLM_MODEL` | backend | Google chat model | `gemini-1.5-flash` |
| `CHUNK_SIZE` | backend | Text chunk size (chars) | `1000` |
| `CHUNK_OVERLAP` | backend | Chunk overlap (chars) | `200` |
| `TOP_K_RESULTS` | backend | Retrieval top-K | `4` |
| `NEXT_PUBLIC_API_URL` | frontend `.env.local` | Backend API base URL | `http://localhost:8000/api/v1` |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/documents/upload` | Upload and index a document |
| `GET` | `/api/v1/documents` | List all indexed documents |
| `DELETE` | `/api/v1/documents/{id}` | Delete document and purge vectors |
| `POST` | `/api/v1/chat/query` | Ask a question, get grounded answer |
| `GET` | `/api/v1/analytics/stats` | Dashboard metrics |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Frontend                        │
│  ┌──────────────────┐    ┌─────────────────────────────┐  │
│  │  Employee Chat   │    │       Admin Hub             │  │
│  │  - ChatContainer │    │  - UploadModal              │  │
│  │  - MessageBubble │    │  - DocManager               │  │
│  │  - Citations     │    │  - AnalyticsView            │  │
│  └────────┬─────────┘    └──────────────┬──────────────┘  │
└───────────┼───────────────────────────────┼─────────────────┘
            │         REST API            │
            ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │  Ingestion  │  │  Hybrid      │  │  RAG Generator     │  │
│  │  Engine     │  │  Retriever   │  │  (gemini-1.5-flash)│  │
│  │  PDF/DOCX/  │  │  75% Vector  │  │  Anti-hallucination│  │
│  │  TXT Loader │  │  25% BM25    │  │  prompt + citations│  │
│  └──────┬──────┘  └──────┬───────┘  └─────────┬──────────┘  │
└─────────┼────────────────┼──────────────────────┼─────────────┘
          ▼                ▼                      ▼
   ┌────────────┐   ┌────────────┐        ┌────────────┐
   │  ChromaDB  │   │  SQLite    │        │  Google    │
   │  Vectors   │   │  Metadata  │        │  Gemini    │
   └────────────┘   └────────────┘        └────────────┘
```

## Tech Stack

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green)
![LangChain](https://img.shields.io/badge/LangChain-0.2-orange)
![ChromaDB](https://img.shields.io/badge/ChromaDB-0.5-purple)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)
![Google Gemini](https://img.shields.io/badge/Google-Gemini-4285F4)

## Project Structure

```
enterprise-rag/
├── backend/
│   ├── main.py              # FastAPI app & routes
│   ├── config.py            # Settings
│   ├── database.py          # SQLite manager
│   ├── rag/
│   │   ├── ingestion.py     # Document processing & indexing
│   │   ├── retriever.py     # Hybrid vector + BM25 search
│   │   └── generator.py     # LLM answer generation
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages & layout
│   │   ├── components/
│   │   │   ├── chat/        # Employee portal
│   │   │   └── admin/       # Admin portal
│   │   └── lib/api.ts       # API client
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## License

MIT
