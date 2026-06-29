import os
import uuid
from contextlib import asynccontextmanager

import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import database
from rag.generator import RAGGenerator
from rag.ingestion import DocumentIngestionEngine
from rag.retriever import HybridRetriever

UPLOAD_DIR = "./documents/temp"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    database.init_db()
    yield
    # Shutdown
    pass


app = FastAPI(title="Enterprise RAG AI Assistant", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ingestion_engine = DocumentIngestionEngine()
rag_generator = RAGGenerator()
hybrid_retriever = HybridRetriever()


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Enterprise RAG API is running"}


class QueryRequest(BaseModel):
    session_id: str
    query: str


class QueryResponse(BaseModel):
    answer: str
    confidence_score: float
    sources: list
    response_time_ms: int
    mode: str = "general"


@app.post("/api/v1/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    allowed_extensions = {".pdf", ".docx", ".txt"}
    ext = os.path.splitext(file.filename or "")[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed: PDF, DOCX, TXT",
        )

    temp_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")

    try:
        async with aiofiles.open(temp_path, "wb") as out_file:
            content = await file.read()
            await out_file.write(content)

        result = ingestion_engine.process_and_index_file(temp_path, file.filename)
        return result
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.get("/api/v1/documents")
def list_documents():
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM documents ORDER BY upload_timestamp DESC"
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


@app.delete("/api/v1/documents/{doc_id}")
def delete_document(doc_id: str):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")

    hybrid_retriever.delete_by_document_id(doc_id)
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()

    return {"message": "Document deleted successfully", "document_id": doc_id}


@app.post("/api/v1/chat/query")
async def chat_query(request: QueryRequest):
    try:
        result = rag_generator.generate_answer(
            query=request.query,
            session_id=request.session_id,
        )
        return result
    except Exception as e:
        return {
            "answer": f"Server error: {str(e)}. Please try again.",
            "confidence_score": 0,
            "sources": [],
            "response_time_ms": 0,
            "mode": "error",
        }


@app.get("/api/v1/analytics/stats")
def analytics_stats():
    conn = database.get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM search_analytics")
    total_queries = cursor.fetchone()["total"]

    cursor.execute(
        "SELECT AVG(response_time_ms) as avg_time FROM search_analytics"
    )
    avg_time_row = cursor.fetchone()
    average_response_time_ms = round(avg_time_row["avg_time"] or 0, 1)

    cursor.execute(
        "SELECT AVG(confidence_score) as avg_conf FROM search_analytics"
    )
    avg_conf_row = cursor.fetchone()
    average_confidence_score = round((avg_conf_row["avg_conf"] or 0) * 100, 1)

    cursor.execute(
        """
        SELECT top_document_matched, COUNT(*) as query_count
        FROM search_analytics
        WHERE top_document_matched IS NOT NULL
        GROUP BY top_document_matched
        ORDER BY query_count DESC
        LIMIT 5
        """
    )
    popular_rows = cursor.fetchall()
    conn.close()

    popular_documents = [
        {"document": row["top_document_matched"], "query_count": row["query_count"]}
        for row in popular_rows
    ]

    return {
        "total_queries": total_queries,
        "average_response_time_ms": average_response_time_ms,
        "average_confidence_score": average_confidence_score,
        "popular_documents": popular_documents,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
