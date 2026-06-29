from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracao(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://empresa_ia:empresa_ia@localhost:5432/empresa_ia"
    jwt_secret: str = "dev-secret"
    jwt_access_ttl_min: int = 30
    jwt_refresh_ttl_days: int = 14
    storage_backend: str = "filesystem"
    storage_root: str = "./storage_local"
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    # ───────── Provedores de IA (modelos NUNCA fixos em código) ─────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_vision_model: str = ""  # vazio => usa gemini_model

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    openrouter_api_key: str = ""
    openrouter_model: str = "deepseek/deepseek-chat-v3"
    openrouter_vision_model: str = ""

    huggingface_api_key: str = ""
    hf_model: str = "black-forest-labs/FLUX.1-schnell"
    hf_ocr_model: str = "microsoft/trocr-large-printed"
    hf_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    hf_background_model: str = "briaai/RMBG-1.4"
    hf_vision_model: str = "Salesforce/blip-image-captioning-large"

    fal_key: str = ""
    fal_model: str = "flux/schnell"
    fal_video_model: str = "fal-ai/minimax-video"

    replicate_api_key: str = ""
    replicate_image_model: str = ""
    replicate_upscale_model: str = ""
    replicate_inpaint_model: str = ""

    # ───────── Perfis e Modo (Fase 5.1) ─────────
    ia_profile: str = "production"
    ia_modo: str = "automatico"  # "automatico" | "manual"

    # ───────── Monitoramento de IA (Fase 2) ─────────
    ia_health_hour: int = 8
    ia_health_minute: int = 0
    ia_health_timezone: str = "America/Sao_Paulo"
    ia_health_scheduler_enabled: bool = True

    # ───────── Observabilidade de IA (Fase 4) ─────────
    ia_store_prompts: bool = False  # LGPD: por padrão só SHA256 do prompt




    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


config = Configuracao()
