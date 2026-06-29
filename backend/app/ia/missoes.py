"""Missões (Fase 5.1).

Uma Missão é a INTENÇÃO de negócio (Criar Post, Gerar Banner, OCR Documento),
desacoplada da escolha de provider/modelo. O roteador consome a missão para
selecionar candidatos.

Adicionar nova missão = uma linha em `MISSOES`. Nenhum outro arquivo muda.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from app.ia.categorias import CategoriaIA, EspecializacaoIA

PrefMissao = Literal["velocidade", "qualidade", "custo", "precisao"]


@dataclass(frozen=True)
class Missao:
    nome: str
    categoria: CategoriaIA
    especializacao: EspecializacaoIA
    prefere: PrefMissao = "velocidade"
    max_tokens: int | None = None
    aceita_alta_latencia: bool = False
    descricao: str = ""

    def to_dict(self) -> dict:
        return {
            "nome": self.nome,
            "categoria": self.categoria.value,
            "especializacao": self.especializacao.value,
            "prefere": self.prefere,
            "max_tokens": self.max_tokens,
            "aceita_alta_latencia": self.aceita_alta_latencia,
            "descricao": self.descricao,
        }


MISSOES: dict[str, Missao] = {
    "criar_post": Missao(
        "criar_post", CategoriaIA.CHAT, EspecializacaoIA.CHAT_FAST,
        prefere="velocidade", max_tokens=3000,
        descricao="Geração de post de marketing — texto curto, baixa latência, baixo custo.",
    ),
    "gerar_banner": Missao(
        "gerar_banner", CategoriaIA.IMAGE, EspecializacaoIA.IMAGE_GENERATION,
        prefere="qualidade", aceita_alta_latencia=True,
        descricao="Banner publicitário — prioriza qualidade visual, aceita maior latência.",
    ),
    "ocr_documento": Missao(
        "ocr_documento", CategoriaIA.OCR, EspecializacaoIA.OCR_HIGH_ACCURACY,
        prefere="precisao", aceita_alta_latencia=True,
        descricao="OCR de documento — precisão máxima, latência irrelevante.",
    ),
    "transcrever_audio": Missao(
        "transcrever_audio", CategoriaIA.AUDIO, EspecializacaoIA.TRANSCRIPTION,
        prefere="precisao", aceita_alta_latencia=True,
        descricao="Transcrição de áudio em texto.",
    ),
    "embeddings_busca": Missao(
        "embeddings_busca", CategoriaIA.EMBEDDINGS, EspecializacaoIA.EMBEDDINGS,
        prefere="custo",
        descricao="Geração de embeddings para busca semântica.",
    ),
}


def obter(nome: str) -> Missao:
    try:
        return MISSOES[nome]
    except KeyError as exc:
        raise KeyError(f"Missão '{nome}' não definida.") from exc


def listar() -> list[Missao]:
    return list(MISSOES.values())
