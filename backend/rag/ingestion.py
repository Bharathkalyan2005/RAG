import os
import uuid
from pathlib import Path

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader, TextLoader
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from config import settings
from database import get_db_connection


class DocumentIngestionEngine:
    def __init__(self) -> None:
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            google_api_key=settings.GOOGLE_API_KEY,
        )
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
        self.vector_store = Chroma(
            collection_name="enterprise_docs",
            embedding_function=self.embeddings,
            persist_directory=settings.CHROMA_PERSIST_DIR,
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
            separators=["\n\n", "\n", " ", ""],
        )

    def _load_documents(self, file_path: str, file_type: str):
        if file_type == "pdf":
            return PyPDFLoader(file_path).load()
        if file_type == "docx":
            return Docx2txtLoader(file_path).load()
        return TextLoader(file_path, encoding="utf-8").load()

    def process_and_index_file(self, file_path: str, original_filename: str) -> dict:
        document_id = str(uuid.uuid4())
        file_type = Path(original_filename).suffix.lower().lstrip(".")
        file_size = os.path.getsize(file_path)

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO documents (id, filename, file_type, file_size, chunk_count, status)
            VALUES (?, ?, ?, ?, 0, 'INDEXING')
            """,
            (document_id, original_filename, file_type, file_size),
        )
        conn.commit()
        conn.close()

        try:
            raw_docs = self._load_documents(file_path, file_type)
            chunks = self.text_splitter.split_documents(raw_docs)

            for idx, chunk in enumerate(chunks):
                page_number = chunk.metadata.get("page", 0)
                if isinstance(page_number, float):
                    page_number = int(page_number)
                chunk.metadata.update(
                    {
                        "document_id": document_id,
                        "filename": original_filename,
                        "page_number": page_number,
                        "chunk_index": idx,
                    }
                )

            if chunks:
                self.vector_store.add_documents(chunks)

            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE documents
                SET chunk_count = ?, status = 'COMPLETED'
                WHERE id = ?
                """,
                (len(chunks), document_id),
            )
            conn.commit()
            conn.close()

            return {
                "document_id": document_id,
                "chunks_indexed": len(chunks),
                "status": "COMPLETED",
            }
        except Exception:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE documents SET status = 'FAILED' WHERE id = ?",
                (document_id,),
            )
            conn.commit()
            conn.close()
            raise
