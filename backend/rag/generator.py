import json
import time

from langchain_huggingface import HuggingFaceEndpoint
from langchain_core.messages import HumanMessage, SystemMessage

from config import settings
from database import get_db_connection
from rag.retriever import HybridRetriever

SYSTEM_PROMPT_TEMPLATE = """You are an expert Enterprise Document Assistant. Answer ONLY using the retrieved context below.

RULES:
1. If the answer is not in the context, reply EXACTLY: "I couldn't find this information in the uploaded documents."
2. Do not fabricate facts or use outside knowledge.
3. Keep answers precise and professional.
4. Every claim must be traceable to the provided sources.

=== RETRIEVED CONTEXT ===
{context_str}
"""


class RAGGenerator:
    def __init__(self) -> None:
        self.llm = HuggingFaceEndpoint(
            repo_id=settings.LLM_MODEL,
            huggingfacehub_api_token=settings.HF_API_KEY,
            max_new_tokens=1024,
            temperature=0.1,
        )
        self.retriever = HybridRetriever()

    def generate_answer(self, query: str, session_id: str) -> dict:
        start_time = time.time()

        chunks = self.retriever.retrieve(query, top_k=settings.TOP_K_RESULTS)

        if not chunks:
            response_time_ms = int((time.time() - start_time) * 1000)
            self._log_analytics(query, response_time_ms, 0.0, None)
            return {
                "answer": "I couldn't find this information in the uploaded documents.",
                "confidence_score": 0.0,
                "sources": [],
                "response_time_ms": response_time_ms,
            }

        context_parts = []
        for idx, chunk in enumerate(chunks, start=1):
            context_parts.append(
                f"[Source {idx}: {chunk['filename']} - Page {chunk['page']}]\n{chunk['content']}"
            )
        context_str = "\n\n".join(context_parts)

        avg_relevance = sum(c["relevance_score"] for c in chunks) / len(chunks)
        confidence = min(max(avg_relevance, 0.0), 1.0)

        prompt = SYSTEM_PROMPT_TEMPLATE.format(context_str=context_str)
        response = self.llm.invoke(
            [
                SystemMessage(content=prompt),
                HumanMessage(content=query),
            ]
        )
        answer = response.strip()

        if "couldn't find" in answer.lower():
            confidence = 0.0

        confidence_score = round(confidence * 100, 1)
        response_time_ms = int((time.time() - start_time) * 1000)

        sources = [
            {
                "filename": chunk["filename"],
                "page": chunk["page"],
                "excerpt": chunk["content"],
                "relevance_score": chunk["relevance_score"],
            }
            for chunk in chunks
        ]

        top_document = chunks[0]["filename"] if chunks else None
        self._log_analytics(query, response_time_ms, confidence, top_document)
        self._save_chat_messages(session_id, query, answer, sources)

        return {
            "answer": answer,
            "confidence_score": confidence_score,
            "sources": sources,
            "response_time_ms": response_time_ms,
        }

    def _log_analytics(
        self,
        query: str,
        response_time_ms: int,
        confidence: float,
        top_document: str | None,
    ) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO search_analytics
            (query_text, response_time_ms, confidence_score, top_document_matched)
            VALUES (?, ?, ?, ?)
            """,
            (query, response_time_ms, confidence, top_document),
        )
        conn.commit()
        conn.close()

    def _save_chat_messages(
        self, session_id: str, query: str, answer: str, sources: list
    ) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT session_id FROM chat_sessions WHERE session_id = ?",
            (session_id,),
        )
        if not cursor.fetchone():
            cursor.execute(
                "INSERT INTO chat_sessions (session_id, user_id) VALUES (?, ?)",
                (session_id, "anonymous"),
            )

        cursor.execute(
            "INSERT INTO chat_messages (session_id, role, content) VALUES (?, 'user', ?)",
            (session_id, query),
        )
        cursor.execute(
            """
            INSERT INTO chat_messages (session_id, role, content, citations_json)
            VALUES (?, 'assistant', ?, ?)
            """,
            (session_id, answer, json.dumps(sources)),
        )

        conn.commit()
        conn.close()
