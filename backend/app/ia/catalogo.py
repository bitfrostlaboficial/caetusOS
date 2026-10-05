"""Catálogo declarativo (Fase 5.1).

Uma `EntradaCatalogo` associa um Provider a uma Categoria + Especialização.
O MODELO vem sempre do `.env` (via factory) — nunca é hardcoded aqui.
O PESO vem do perfil ativo, com fallback para o default declarado.

Para adicionar um novo provider/especialização, basta acrescentar uma entrada.
Nenhum código existente precisa ser alterado.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from app.configuracao import config
from app.ia.categorias import CategoriaIA, CustoEstimado, EspecializacaoIA
from app.ia.perfis import peso as peso_perfil
from app.ia.provedores.base import Capabilities


@dataclass(frozen=True)
class EntradaCatalogo:
    provider: str
    categoria: CategoriaIA
    especializacao: EspecializacaoIA
    modelo_factory: Callable[[], str]
    peso_default: int
    custo: CustoEstimado
    capabilities: Capabilities

    @property
    def modelo(self) -> str:
        try:
            return self.modelo_factory() or ""
        except Exception:  # noqa: BLE001
            return ""

    @property
    def peso(self) -> int:
        return peso_perfil(
            self.provider, self.categoria.value, self.especializacao.value, self.peso_default,
        )

    def to_dict(self) -> dict:
        return {
            "provider": self.provider,
            "categoria": self.categoria.value,
            "especializacao": self.especializacao.value,
            "modelo": self.modelo,
            "peso": self.peso,
            "custo": self.custo.value,
            "capabilities": self.capabilities.to_dict(),
        }


# Helpers de Capabilities por entrada (cada MODELO tem as suas — não o provider).
def _caps(**flags: bool) -> Capabilities:
    return Capabilities(**flags)


def CATALOGO_PADRAO() -> list[EntradaCatalogo]:
    """Lista construída a cada chamada — assim `modelo_factory` reflete sempre
    o `config` atual (suporta reload de .env em testes/dev).
    """
    return [
        # ───────── Groq — chat rápido ─────────
        EntradaCatalogo(
            "groq", CategoriaIA.CHAT, EspecializacaoIA.CHAT_FAST,
            lambda: config.groq_model, 100, CustoEstimado.FREE, _caps(chat=True),
        ),
        EntradaCatalogo(
            "groq", CategoriaIA.CHAT, EspecializacaoIA.CHAT_REASONING,
            lambda: config.groq_model, 60, CustoEstimado.FREE, _caps(chat=True),
        ),
        EntradaCatalogo(
            "groq", CategoriaIA.TEXT, EspecializacaoIA.TEXT_GENERAL,
            lambda: config.groq_model, 100, CustoEstimado.FREE, _caps(chat=True),
        ),

        # ───────── Gemini — multimodal versátil ─────────
        EntradaCatalogo(
            "gemini", CategoriaIA.CHAT, EspecializacaoIA.CHAT_FAST,
            lambda: config.gemini_model, 70, CustoEstimado.LOW, _caps(chat=True, vision=True),
        ),
        EntradaCatalogo(
            "gemini", CategoriaIA.CHAT, EspecializacaoIA.CHAT_REASONING,
            lambda: config.gemini_model, 100, CustoEstimado.LOW, _caps(chat=True, vision=True),
        ),
        EntradaCatalogo(
            "gemini", CategoriaIA.CHAT, EspecializacaoIA.CHAT_LONG_CONTEXT,
            lambda: config.gemini_model, 100, CustoEstimado.LOW, _caps(chat=True, vision=True),
        ),
        EntradaCatalogo(
            "gemini", CategoriaIA.TEXT, EspecializacaoIA.TEXT_GENERAL,
            lambda: config.gemini_model, 80, CustoEstimado.LOW, _caps(chat=True),
        ),
        EntradaCatalogo(
            "gemini", CategoriaIA.VISION, EspecializacaoIA.VISION_GENERAL,
            lambda: config.gemini_model, 100, CustoEstimado.LOW, _caps(vision=True),
        ),
        EntradaCatalogo(
            "gemini", CategoriaIA.OCR, EspecializacaoIA.OCR_BASIC,
            lambda: config.gemini_model, 90, CustoEstimado.LOW, _caps(ocr=True, vision=True),
        ),
        EntradaCatalogo(
            "gemini", CategoriaIA.OCR, EspecializacaoIA.OCR_HIGH_ACCURACY,
            lambda: config.gemini_model, 70, CustoEstimado.LOW, _caps(ocr=True, vision=True),
        ),

        # ───────── Mistral — chat/texto (API OpenAI-compatível) ─────────
        EntradaCatalogo(
            "mistral", CategoriaIA.CHAT, EspecializacaoIA.CHAT_FAST,
            lambda: config.mistral_model, 75, CustoEstimado.LOW, _caps(chat=True),
        ),
        EntradaCatalogo(
            "mistral", CategoriaIA.CHAT, EspecializacaoIA.CHAT_REASONING,
            lambda: config.mistral_model, 75, CustoEstimado.LOW, _caps(chat=True),
        ),
        EntradaCatalogo(
            "mistral", CategoriaIA.TEXT, EspecializacaoIA.TEXT_GENERAL,
            lambda: config.mistral_model, 75, CustoEstimado.LOW, _caps(chat=True),
        ),

        # ───────── NVIDIA NIM — modelos abertos (chave gratuita de desenvolvedor) ─────────
        EntradaCatalogo(
            "nvidia", CategoriaIA.CHAT, EspecializacaoIA.CHAT_FAST,
            lambda: config.nvidia_model, 60, CustoEstimado.FREE, _caps(chat=True),
        ),
        EntradaCatalogo(
            "nvidia", CategoriaIA.CHAT, EspecializacaoIA.CHAT_REASONING,
            lambda: config.nvidia_model, 70, CustoEstimado.FREE, _caps(chat=True),
        ),
        EntradaCatalogo(
            "nvidia", CategoriaIA.TEXT, EspecializacaoIA.TEXT_GENERAL,
            lambda: config.nvidia_model, 60, CustoEstimado.FREE, _caps(chat=True),
        ),

        # ───────── Cloudflare Workers AI — texto (10k neurons/dia grátis) ─────────
        EntradaCatalogo(
            "cloudflare", CategoriaIA.CHAT, EspecializacaoIA.CHAT_FAST,
            lambda: config.cloudflare_model, 65, CustoEstimado.FREE, _caps(chat=True),
        ),
        EntradaCatalogo(
            "cloudflare", CategoriaIA.TEXT, EspecializacaoIA.TEXT_GENERAL,
            lambda: config.cloudflare_model, 55, CustoEstimado.FREE, _caps(chat=True),
        ),

        # ───────── OpenRouter — fallback universal ─────────
        EntradaCatalogo(
            "openrouter", CategoriaIA.CHAT, EspecializacaoIA.CHAT_FAST,
            lambda: config.openrouter_model, 50, CustoEstimado.MEDIUM, _caps(chat=True),
        ),
        EntradaCatalogo(
            "openrouter", CategoriaIA.CHAT, EspecializacaoIA.CHAT_REASONING,
            lambda: config.openrouter_model, 80, CustoEstimado.MEDIUM, _caps(chat=True),
        ),
        EntradaCatalogo(
            "openrouter", CategoriaIA.CHAT, EspecializacaoIA.CHAT_LONG_CONTEXT,
            lambda: config.openrouter_model, 70, CustoEstimado.MEDIUM, _caps(chat=True),
        ),
        EntradaCatalogo(
            "openrouter", CategoriaIA.TEXT, EspecializacaoIA.TEXT_GENERAL,
            lambda: config.openrouter_model, 60, CustoEstimado.MEDIUM, _caps(chat=True),
        ),
        EntradaCatalogo(
            "openrouter", CategoriaIA.VISION, EspecializacaoIA.VISION_GENERAL,
            lambda: config.openrouter_model, 60, CustoEstimado.MEDIUM, _caps(vision=True),
        ),

        # ───────── Hugging Face — especializações ─────────
        EntradaCatalogo(
            "huggingface", CategoriaIA.OCR, EspecializacaoIA.OCR_HIGH_ACCURACY,
            lambda: config.hf_ocr_model, 100, CustoEstimado.FREE, _caps(ocr=True),
        ),
        EntradaCatalogo(
            "huggingface", CategoriaIA.EMBEDDINGS, EspecializacaoIA.EMBEDDINGS,
            lambda: config.hf_embedding_model, 100, CustoEstimado.FREE, _caps(embeddings=True),
        ),
        EntradaCatalogo(
            "huggingface", CategoriaIA.IMAGE, EspecializacaoIA.IMAGE_GENERATION,
            lambda: config.hf_model, 70, CustoEstimado.FREE, _caps(image_generation=True),
        ),
        EntradaCatalogo(
            "huggingface", CategoriaIA.IMAGE, EspecializacaoIA.BACKGROUND_REMOVAL,
            lambda: config.hf_background_model, 100, CustoEstimado.FREE, _caps(image_generation=True),
        ),

        # ───────── Gemini — imagem (melhor qualidade que o FLUX schnell; costuma exigir cobrança) ─────────
        EntradaCatalogo(
            "gemini", CategoriaIA.IMAGE, EspecializacaoIA.IMAGE_GENERATION,
            lambda: config.gemini_image_model, 110, CustoEstimado.MEDIUM, _caps(image_generation=True),
        ),

        # ───────── Cloudflare Workers AI — imagem FLUX (grátis, mas qualidade inferior: último recurso) ─────────
        EntradaCatalogo(
            "cloudflare", CategoriaIA.IMAGE, EspecializacaoIA.IMAGE_GENERATION,
            lambda: config.cloudflare_image_model, 40, CustoEstimado.FREE, _caps(image_generation=True),
        ),

        # ───────── Fal.ai — imagens & vídeos de alta qualidade ─────────
        EntradaCatalogo(
            "fal", CategoriaIA.IMAGE, EspecializacaoIA.IMAGE_GENERATION,
            lambda: config.fal_model, 100, CustoEstimado.MEDIUM, _caps(image_generation=True),
        ),
        EntradaCatalogo(
            "fal", CategoriaIA.VIDEO, EspecializacaoIA.VIDEO_GENERATION,
            lambda: config.fal_video_model, 100, CustoEstimado.HIGH, _caps(),
        ),
        EntradaCatalogo(
            "fal", CategoriaIA.AUDIO, EspecializacaoIA.TRANSCRIPTION,
            lambda: config.fal_model, 100, CustoEstimado.LOW, _caps(audio=True),
        ),

        # ───────── Replicate — reservado para Fase 6 (peso 0, sem provider ativo) ─────────
        # Quando adapter for criado, basta subir o peso. Não quebra nada hoje.
    ]
