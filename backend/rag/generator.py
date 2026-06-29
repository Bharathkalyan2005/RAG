import time

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from config import settings
from database import get_db_connection
from rag.retriever import HybridRetriever


class RAGGenerator:
    def __init__(self) -> None:
        self.llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            temperature=0.1,
            google_api_key=settings.GOOGLE_API_KEY,
            max_output_tokens=1024,
        )
        self.retriever = HybridRetriever()

    def generate_answer(self, query: str, session_id: str) -> dict:
        start_time = time.time()

        try:
            retrieved_chunks = self.retriever.retrieve(query, top_k=4)
        except Exception:
            retrieved_chunks = []

        has_context = (
            len(retrieved_chunks) > 0
            and any(c.get("relevance_score", 0) >= 0.3 for c in retrieved_chunks)
        )

        if has_context:
            context_str = ""
            for i, chunk in enumerate(retrieved_chunks):
                context_str += (
                    f"[Source {i + 1}: {chunk.get('filename', 'Unknown')} - "
                    f"Page {chunk.get('page', 'N/A')}]\n"
                    f"{chunk.get('content', '')}\n\n"
                )

            system_prompt = f"""You are a helpful Enterprise Document Assistant.
Answer the question using the document context below.
Always mention which document your answer comes from.
If the context does not contain the answer, say so and answer from general knowledge.

CONTEXT:
{context_str}"""
            mode = "document"
            raw_sources = retrieved_chunks
        else:
            system_prompt = """You are a friendly, helpful AI assistant called Enterprise AI.
Answer all questions helpfully and conversationally.
For greetings like 'hi', 'hello', respond warmly and introduce yourself.
For general questions, answer clearly and accurately.
For company-specific questions, mention the user can upload documents for specific answers."""
            mode = "general"
            raw_sources = []

        try:
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=query),
            ]
            response = self.llm.invoke(messages)
            answer = response.content
        except Exception as e:
            answer = f"Sorry, I encountered an error: {str(e)}. Please try again."
            mode = "error"
            raw_sources = []

        if mode == "document" and raw_sources:
            scores = [c.get("relevance_score", 0.5) for c in raw_sources]
            confidence = round(min(sum(scores) / len(scores) * 100, 100), 1)
        elif mode == "general":
            confidence = 95.0
        else:
            confidence = 0.0

        response_time_ms = int((time.time() - start_time) * 1000)

        sources = (
            [
                {
                    "filename": c.get("filename", "Unknown"),
                    "page": c.get("page", 0),
                    "excerpt": c.get("content", ""),
                    "relevance_score": c.get("relevance_score", 0),
                }
                for c in raw_sources
            ]
            if mode == "document"
            else []
        )

        try:
            conn = get_db_connection()
            conn.execute(
                """INSERT INTO search_analytics
                   (query_text, response_time_ms, confidence_score, top_document_matched)
                   VALUES (?, ?, ?, ?)""",
                (
                    query,
                    response_time_ms,
                    confidence,
                    raw_sources[0].get("filename") if raw_sources else None,
                ),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

        return {
            "answer": answer,
            "confidence_score": confidence,
            "sources": sources,
            "response_time_ms": response_time_ms,
            "mode": mode,
        }
