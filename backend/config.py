import os

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_NAME: str = "Enterprise RAG AI Assistant"
    HF_API_KEY: str = os.getenv("HF_API_KEY", "")
    CHROMA_PERSIST_DIR: str = "./vector_db"
    SQLITE_DB_PATH: str = "./database/enterprise_rag.db"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    LLM_MODEL: str = "google/gemma-4-31b-it"
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    TOP_K_RESULTS: int = 4


settings = Settings()
