import os
import re

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from rank_bm25 import BM25Okapi

from config import settings


class HybridRetriever:
    def __init__(self) -> None:
        self.embeddings = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL
        )
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        self.vector_store = Chroma(
            collection_name="enterprise_docs",
            embedding_function=self.embeddings,
            persist_directory=settings.CHROMA_PERSIST_DIR,
        )

    def _tokenize(self, text: str) -> list[str]:
        return re.findall(r"\w+", text.lower())

    def _build_bm25_index(self, docs_with_scores: list) -> dict:
        if not docs_with_scores:
            return {}

        corpus = [self._tokenize(doc.page_content) for doc, _ in docs_with_scores]
        bm25 = BM25Okapi(corpus)
        return {"bm25": bm25, "docs": docs_with_scores}

    def retrieve(self, query: str, top_k: int = 4) -> list:
        vector_results = self.vector_store.similarity_search_with_relevance_scores(
            query, k=top_k * 2
        )

        if not vector_results:
            return []

        bm25_data = self._build_bm25_index(vector_results)
        query_tokens = self._tokenize(query)
        bm25_scores = bm25_data["bm25"].get_scores(query_tokens)

        max_bm25 = max(bm25_scores) if len(bm25_scores) > 0 and max(bm25_scores) > 0 else 1.0

        combined: list[tuple] = []
        for idx, (doc, vector_score) in enumerate(vector_results):
            normalized_bm25 = bm25_scores[idx] / max_bm25
            hybrid_score = (0.75 * vector_score) + (0.25 * normalized_bm25)
            combined.append((doc, hybrid_score))

        combined.sort(key=lambda x: x[1], reverse=True)
        top_results = combined[:top_k]

        results = []
        for doc, score in top_results:
            page = doc.metadata.get("page_number", doc.metadata.get("page", 0))
            if isinstance(page, float):
                page = int(page)
            results.append(
                {
                    "content": doc.page_content,
                    "filename": doc.metadata.get("filename", "unknown"),
                    "page": page,
                    "relevance_score": round(min(max(score, 0.0), 1.0), 4),
                }
            )

        return results

    def delete_by_document_id(self, document_id: str) -> None:
        collection = self.vector_store._collection
        collection.delete(where={"document_id": document_id})
