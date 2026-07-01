import logging
import os
from pathlib import Path
from typing import NamedTuple

from pydantic_settings import BaseSettings, SettingsConfigDict

_log = logging.getLogger("caetusos.config")


class DiagnosticoJWTSecret(NamedTuple):
    source: str
    length_bytes: int
    debug: bool
    encontrado: bool


class Configuracao(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+psycopg://empresa_ia:empresa_ia@localhost:5432/empresa_ia"
    jwt_secret: str = "dev-secret"
    jwt_access_ttl_min: int = 30
    jwt_refresh_ttl_days: int = 14

    # ───────── Observabilidade (Fase 6) ─────────
    debug: bool = False
    log_level: str = "INFO"
    log_json: bool = False
    log_color: bool = True
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

    # ───────── Publicação social ─────────
    instagram_access_token: str = ""
    instagram_account_id: str = ""
    instagram_api_version: str = "v20.0"

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

    def _diagnosticar_jwt_secret(self) -> DiagnosticoJWTSecret:
        """Diagnostica a origem do JWT_SECRET sem registrar o valor da chave."""
        nome_env = "JWT_SECRET"
        source = "default"
        encontrado = False

        for chave in os.environ:
            if chave.upper() == nome_env:
                source = "environment"
                encontrado = True
                break

        if not encontrado:
            dotenv_path = Path.cwd() / ".env"
            if dotenv_path.exists():
                for linha in dotenv_path.read_text(encoding="utf-8").splitlines():
                    linha_limpa = linha.strip()
                    if not linha_limpa or linha_limpa.startswith("#") or "=" not in linha_limpa:
                        continue
                    chave, _valor = linha_limpa.split("=", 1)
                    if chave.strip().upper() == nome_env:
                        source = f".env:{dotenv_path}"
                        encontrado = True
                        break

        secret = self.jwt_secret or ""
        return DiagnosticoJWTSecret(
            source=source,
            length_bytes=len(secret.encode("utf-8")),
            debug=self.debug,
            encontrado=encontrado,
        )

    def _logar_diagnostico_jwt_secret(self, diagnostico: DiagnosticoJWTSecret) -> None:
        _log.info(
            "[CONFIG]\nJWT loaded=%s\nJWT source=%s\nJWT length=%s\nDEBUG=%s",
            str(diagnostico.encontrado).lower(),
            diagnostico.source,
            diagnostico.length_bytes,
            diagnostico.debug,
        )

    def validar_para_api(self) -> None:
        """Validações estritas chamadas no startup da API (lifespan).

        Não roda na importação para não bloquear Alembic, testes e scripts
        administrativos. Em DEBUG=true apenas avisa; caso contrário, levanta.
        """
        diagnostico = self._diagnosticar_jwt_secret()
        self._logar_diagnostico_jwt_secret(diagnostico)

        if not diagnostico.encontrado:
            msg = (
                "JWT_SECRET não encontrado.\n\n"
                f"Length.............: {diagnostico.length_bytes}\n"
                f"DEBUG..............: {str(diagnostico.debug).lower()}\n"
                f"Source.............: {diagnostico.source}\n"
                "Required...........: >=32 bytes"
            )
            if self.debug:
                _log.warning("[CONFIG] %s (ignorado em DEBUG=true)", msg)
            else:
                raise RuntimeError(msg)

        if diagnostico.length_bytes < 32:
            msg = (
                "JWT_SECRET inválido.\n\n"
                f"Length.............: {diagnostico.length_bytes}\n"
                f"DEBUG..............: {str(diagnostico.debug).lower()}\n"
                f"Source.............: {diagnostico.source}\n"
                "Required...........: >=32 bytes"
            )
            if self.debug:
                _log.warning("[CONFIG] %s (ignorado em DEBUG=true)", msg)
            else:
                raise RuntimeError(msg)


config = Configuracao()

