"""Categorias e Especializações de IA (Fase 5.1).

Separação obrigatória:
- `CategoriaIA`  = família ampla (CHAT, IMAGE, OCR …)
- `EspecializacaoIA` = subdivisão fina (IMAGE_GENERATION, OCR_HIGH_ACCURACY …)

O roteador trabalha SEMPRE em duas dimensões: Categoria → Especialização.
Adicionar uma nova especialização é uma operação aditiva — nenhum código existente
precisa ser modificado.
"""
from __future__ import annotations

from enum import StrEnum


class CategoriaIA(StrEnum):
    CHAT = "chat"
    TEXT = "text"
    VISION = "vision"
    OCR = "ocr"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    EMBEDDINGS = "embeddings"


class EspecializacaoIA(StrEnum):
    # ── Texto / Chat ──────────────────────────────────────────────
    CHAT_FAST = "chat_fast"
    CHAT_REASONING = "chat_reasoning"
    CHAT_LONG_CONTEXT = "chat_long_context"
    TEXT_GENERAL = "text_general"

    # ── Visão / OCR ───────────────────────────────────────────────
    VISION_GENERAL = "vision_general"
    OCR_BASIC = "ocr_basic"
    OCR_HIGH_ACCURACY = "ocr_high_accuracy"

    # ── Imagem ────────────────────────────────────────────────────
    IMAGE_GENERATION = "image_generation"
    IMAGE_EDIT = "image_edit"
    IMAGE_VARIATION = "image_variation"
    UPSCALE = "upscale"
    INPAINT = "inpaint"
    OUTPAINT = "outpaint"
    BACKGROUND_REMOVAL = "background_removal"
    STYLE_TRANSFER = "style_transfer"
    LOGO_GENERATION = "logo_generation"
    THUMBNAIL_GENERATION = "thumbnail_generation"
    SOCIAL_POST_IMAGE = "social_post_image"
    PHOTO_REALISM = "photo_realism"

    # ── Vídeo ─────────────────────────────────────────────────────
    VIDEO_GENERATION = "video_generation"
    VIDEO_EDIT = "video_edit"
    VIDEO_UPSCALE = "video_upscale"

    # ── Áudio ─────────────────────────────────────────────────────
    TRANSCRIPTION = "transcription"
    TEXT_TO_SPEECH = "text_to_speech"
    VOICE_CLONE = "voice_clone"

    # ── Embeddings ────────────────────────────────────────────────
    EMBEDDINGS = "embeddings"


class CustoEstimado(StrEnum):
    FREE = "free"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    UNKNOWN = "unknown"


# Mapa especialização → categoria "mãe" (para relax automático).
ESPECIALIZACAO_DA_CATEGORIA: dict[EspecializacaoIA, CategoriaIA] = {
    EspecializacaoIA.CHAT_FAST: CategoriaIA.CHAT,
    EspecializacaoIA.CHAT_REASONING: CategoriaIA.CHAT,
    EspecializacaoIA.CHAT_LONG_CONTEXT: CategoriaIA.CHAT,
    EspecializacaoIA.TEXT_GENERAL: CategoriaIA.TEXT,
    EspecializacaoIA.VISION_GENERAL: CategoriaIA.VISION,
    EspecializacaoIA.OCR_BASIC: CategoriaIA.OCR,
    EspecializacaoIA.OCR_HIGH_ACCURACY: CategoriaIA.OCR,
    EspecializacaoIA.IMAGE_GENERATION: CategoriaIA.IMAGE,
    EspecializacaoIA.IMAGE_EDIT: CategoriaIA.IMAGE,
    EspecializacaoIA.IMAGE_VARIATION: CategoriaIA.IMAGE,
    EspecializacaoIA.UPSCALE: CategoriaIA.IMAGE,
    EspecializacaoIA.INPAINT: CategoriaIA.IMAGE,
    EspecializacaoIA.OUTPAINT: CategoriaIA.IMAGE,
    EspecializacaoIA.BACKGROUND_REMOVAL: CategoriaIA.IMAGE,
    EspecializacaoIA.STYLE_TRANSFER: CategoriaIA.IMAGE,
    EspecializacaoIA.LOGO_GENERATION: CategoriaIA.IMAGE,
    EspecializacaoIA.THUMBNAIL_GENERATION: CategoriaIA.IMAGE,
    EspecializacaoIA.SOCIAL_POST_IMAGE: CategoriaIA.IMAGE,
    EspecializacaoIA.PHOTO_REALISM: CategoriaIA.IMAGE,
    EspecializacaoIA.VIDEO_GENERATION: CategoriaIA.VIDEO,
    EspecializacaoIA.VIDEO_EDIT: CategoriaIA.VIDEO,
    EspecializacaoIA.VIDEO_UPSCALE: CategoriaIA.VIDEO,
    EspecializacaoIA.TRANSCRIPTION: CategoriaIA.AUDIO,
    EspecializacaoIA.TEXT_TO_SPEECH: CategoriaIA.AUDIO,
    EspecializacaoIA.VOICE_CLONE: CategoriaIA.AUDIO,
    EspecializacaoIA.EMBEDDINGS: CategoriaIA.EMBEDDINGS,
}
