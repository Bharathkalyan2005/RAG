from config import settings


def get_embeddings():
    model = settings.EMBEDDING_MODEL

    if model.startswith("models/") or model.startswith("gemini"):
        from langchain_google_genai import GoogleGenerativeAIEmbeddings

        return GoogleGenerativeAIEmbeddings(
            model=model,
            google_api_key=settings.GOOGLE_API_KEY,
        )

    from langchain_community.embeddings import HuggingFaceEmbeddings

    return HuggingFaceEmbeddings(model_name=model)
